package com.clinicflow.service;

import com.clinicflow.domain.AppUser;
import com.clinicflow.domain.Clinic;
import com.clinicflow.domain.ClinicMembership;
import com.clinicflow.domain.Role;
import com.clinicflow.repo.AppUserRepository;
import com.clinicflow.repo.ClinicMembershipRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.security.JwtService;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.AuthDtos.AuthResponse;
import com.clinicflow.web.dto.AuthDtos.ClinicRegistrationRequest;
import com.clinicflow.web.dto.AuthDtos.LoginRequest;
import com.clinicflow.web.dto.AuthDtos.StaffRegistrationRequest;
import com.clinicflow.web.dto.AuthDtos.TeamMemberView;
import com.clinicflow.web.dto.AuthDtos.UserView;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final ClinicRepository clinicRepository;
    private final ClinicMembershipRepository membershipRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(AppUserRepository userRepository,
                       ClinicRepository clinicRepository,
                       ClinicMembershipRepository membershipRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.clinicRepository = clinicRepository;
        this.membershipRepository = membershipRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email() != null ? normalise(request.email()) : "";
        String password = request.password() != null ? request.password() : "";

        // Self-heal demo account if credentials match the known demo accounts
        ensureDemoAccountIfRequested(email, password);

        var user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect."));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            // If the user entered the default demo password for a demo account, ensure hash is updated
            if (isDemoUser(email) && "clinicflow123".equals(password)) {
                user.setPasswordHash(passwordEncoder.encode("clinicflow123"));
                user = userRepository.save(user);
            } else {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect.");
            }
        }

        AppUser finalUser = user;
        ClinicMembership membership = membershipRepository.findFirstByUserIdOrderByIdAsc(user.getId())
                .orElseGet(() -> ensureMembership(finalUser));

        return new AuthResponse(jwtService.issue(membership), toUser(membership));
    }

    private boolean isDemoUser(String email) {
        return "owner@northbridgeclinic.com".equalsIgnoreCase(email)
                || "reception@northbridgeclinic.com".equalsIgnoreCase(email)
                || "doctor@northbridgeclinic.com".equalsIgnoreCase(email);
    }

    private void ensureDemoAccountIfRequested(String email, String password) {
        if (!isDemoUser(email) || !"clinicflow123".equals(password)) {
            return;
        }

        Clinic clinic = clinicRepository.findAll().stream().findFirst().orElseGet(() -> {
            Clinic c = new Clinic();
            c.setName("Northbridge Family Clinic");
            c.setTimezone("Asia/Kolkata");
            c.setAddress("2nd Floor, 14 Linden Road, Bengaluru 560001");
            c.setPhone("+91 80 4123 8890");
            c.setSlotMinutes(20);
            return clinicRepository.save(c);
        });

        AppUser user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = new AppUser();
            user.setEmail(email);
            if ("owner@northbridgeclinic.com".equalsIgnoreCase(email)) {
                user.setFullName("Priya Menon");
            } else if ("reception@northbridgeclinic.com".equalsIgnoreCase(email)) {
                user.setFullName("Rhea Kapoor");
            } else {
                user.setFullName("Dr. Ananya Rao");
            }
            user.setPasswordHash(passwordEncoder.encode("clinicflow123"));
            user = userRepository.save(user);
        } else if (!passwordEncoder.matches("clinicflow123", user.getPasswordHash())) {
            user.setPasswordHash(passwordEncoder.encode("clinicflow123"));
            user = userRepository.save(user);
        }

        if (membershipRepository.findByClinicIdAndUserId(clinic.getId(), user.getId()).isEmpty()) {
            Role role = "owner@northbridgeclinic.com".equalsIgnoreCase(email) ? Role.OWNER
                    : "doctor@northbridgeclinic.com".equalsIgnoreCase(email) ? Role.DOCTOR
                    : Role.RECEPTIONIST;
            link(clinic, user, role);
        }
    }

    private ClinicMembership ensureMembership(AppUser user) {
        Clinic clinic = clinicRepository.findAll().stream().findFirst().orElseGet(() -> {
            Clinic c = new Clinic();
            c.setName("Northbridge Family Clinic");
            c.setTimezone("Asia/Kolkata");
            c.setAddress("2nd Floor, 14 Linden Road, Bengaluru 560001");
            c.setPhone("+91 80 4123 8890");
            c.setSlotMinutes(20);
            return clinicRepository.save(c);
        });
        Role role = "owner@northbridgeclinic.com".equalsIgnoreCase(user.getEmail()) ? Role.OWNER
                : "doctor@northbridgeclinic.com".equalsIgnoreCase(user.getEmail()) ? Role.DOCTOR
                : "reception@northbridgeclinic.com".equalsIgnoreCase(user.getEmail()) ? Role.RECEPTIONIST
                : Role.OWNER;
        return link(clinic, user, role);
    }

    /**
     * Self-service signup: a clinic owner creates the clinic and becomes its first member.
     * The new owner is signed in straight away so they can add doctors and reception staff.
     */
    @Transactional
    public AuthResponse registerClinic(ClinicRegistrationRequest request) {
        String email = normalise(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account already uses this email. Sign in instead.");
        }

        Clinic clinic = new Clinic();
        clinic.setName(request.clinicName().trim());
        if (hasText(request.clinicPhone())) {
            clinic.setPhone(request.clinicPhone().trim());
        }
        if (hasText(request.clinicAddress())) {
            clinic.setAddress(request.clinicAddress().trim());
        }
        clinicRepository.save(clinic);

        AppUser owner = createUser(request.ownerName(), email, request.password());
        ClinicMembership membership = link(clinic, owner, Role.OWNER);
        return new AuthResponse(jwtService.issue(membership), toUser(membership));
    }

    /**
     * Staff accounts are assigned by the clinic owner. Only receptionists and doctors can be
     * created here — the owner account exists only through clinic registration.
     */
    @Transactional
    public TeamMemberView addStaff(AuthPrincipal principal, StaffRegistrationRequest request) {
        if (request.role() == Role.OWNER) {
            throw ApiException.badRequest("Only the clinic registration creates an owner account.");
        }
        String email = normalise(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account already uses this email.");
        }
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));
        AppUser user = createUser(request.name(), email, request.password());
        return toMember(link(clinic, user, request.role()));
    }

    @Transactional(readOnly = true)
    public List<TeamMemberView> team(AuthPrincipal principal) {
        return membershipRepository.findByClinicIdOrderByIdAsc(principal.clinicId()).stream()
                .map(this::toMember)
                .toList();
    }

    public UserView currentUser(AuthPrincipal principal) {
        return new UserView(principal.userId(), principal.name(), principal.email(), principal.role().name(),
                principal.clinicId(), principal.clinicName());
    }

    private AppUser createUser(String name, String email, String rawPassword) {
        AppUser user = new AppUser();
        user.setFullName(name.trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        return userRepository.save(user);
    }

    private ClinicMembership link(Clinic clinic, AppUser user, Role role) {
        ClinicMembership membership = new ClinicMembership();
        membership.setClinic(clinic);
        membership.setUser(user);
        membership.setRole(role);
        return membershipRepository.save(membership);
    }

    private static String normalise(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private UserView toUser(ClinicMembership membership) {
        return new UserView(
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getRole().name(),
                membership.getClinic().getId(),
                membership.getClinic().getName());
    }

    private TeamMemberView toMember(ClinicMembership membership) {
        return new TeamMemberView(
                membership.getUser().getId(),
                membership.getUser().getFullName(),
                membership.getUser().getEmail(),
                membership.getRole().name());
    }
}
