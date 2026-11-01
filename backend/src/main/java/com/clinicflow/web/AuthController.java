package com.clinicflow.web;

import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.service.AuthService;
import com.clinicflow.web.dto.AuthDtos.AuthResponse;
import com.clinicflow.web.dto.AuthDtos.ClinicRegistrationRequest;
import com.clinicflow.web.dto.AuthDtos.LoginRequest;
import com.clinicflow.web.dto.AuthDtos.StaffRegistrationRequest;
import com.clinicflow.web.dto.AuthDtos.TeamMemberView;
import com.clinicflow.web.dto.AuthDtos.UserView;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody ClinicRegistrationRequest request) {
        return authService.registerClinic(request);
    }

    @GetMapping("/me")
    public UserView me(@AuthenticationPrincipal AuthPrincipal principal) {
        return authService.currentUser(principal);
    }

    @GetMapping("/team")
    @PreAuthorize("hasRole('OWNER')")
    public List<TeamMemberView> team(@AuthenticationPrincipal AuthPrincipal principal) {
        return authService.team(principal);
    }

    @PostMapping("/team")
    @PreAuthorize("hasRole('OWNER')")
    public TeamMemberView addStaff(@AuthenticationPrincipal AuthPrincipal principal,
                                   @Valid @RequestBody StaffRegistrationRequest request) {
        return authService.addStaff(principal, request);
    }
}
