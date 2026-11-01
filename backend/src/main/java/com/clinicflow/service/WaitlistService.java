package com.clinicflow.service;

import com.clinicflow.domain.*;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.DoctorRepository;
import com.clinicflow.repo.PatientRepository;
import com.clinicflow.repo.WaitlistEntryRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.AppointmentDtos.DoctorRef;
import com.clinicflow.web.dto.AppointmentDtos.PatientRef;
import com.clinicflow.web.dto.DoctorDtos.SlotView;
import com.clinicflow.web.dto.WaitlistDtos.OfferRequest;
import com.clinicflow.web.dto.WaitlistDtos.OpenSlotView;
import com.clinicflow.web.dto.WaitlistDtos.RecoveryQueueView;
import com.clinicflow.web.dto.WaitlistDtos.WaitlistRequest;
import com.clinicflow.web.dto.WaitlistDtos.WaitlistView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class WaitlistService {

    private final WaitlistEntryRepository waitlistRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentRepository appointmentRepository;
    private final AppointmentService appointmentService;
    private final NotificationService notificationService;
    private final AppointmentAssembler assembler;
    private final AvailabilityService availabilityService;

    public WaitlistService(WaitlistEntryRepository waitlistRepository,
                           PatientRepository patientRepository,
                           DoctorRepository doctorRepository,
                           ClinicRepository clinicRepository,
                           AppointmentRepository appointmentRepository,
                           AppointmentService appointmentService,
                           NotificationService notificationService,
                           AppointmentAssembler assembler,
                           AvailabilityService availabilityService) {
        this.waitlistRepository = waitlistRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.clinicRepository = clinicRepository;
        this.appointmentRepository = appointmentRepository;
        this.appointmentService = appointmentService;
        this.notificationService = notificationService;
        this.assembler = assembler;
        this.availabilityService = availabilityService;
    }

    @Transactional(readOnly = true)
    public List<WaitlistView> list(Long clinicId) {
        List<WaitlistEntry> entries = waitlistRepository.findByClinicIdOrderByCreatedAtAsc(clinicId);
        Map<Long, Integer> matchCounts = matchCounts(clinicId);
        return entries.stream()
                .map(e -> toView(e, matchCounts.getOrDefault(e.getId(), 0)))
                .toList();
    }

    @Transactional
    public WaitlistView add(AuthPrincipal principal, WaitlistRequest request) {
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));
        Patient patient = patientRepository.findByIdAndClinicId(request.patientId(), clinic.getId())
                .orElseThrow(() -> ApiException.notFound("Patient not found"));
        Doctor doctor = null;
        if (request.doctorId() != null) {
            doctor = doctorRepository.findById(request.doctorId())
                    .filter(d -> d.getClinic().getId().equals(clinic.getId()))
                    .orElseThrow(() -> ApiException.notFound("Doctor not found"));
        }
        if (request.preferredFrom() != null && request.preferredTo() != null
                && request.preferredTo().isBefore(request.preferredFrom())) {
            throw ApiException.badRequest("The preferred window ends before it starts.");
        }
        WaitlistEntry entry = new WaitlistEntry();
        entry.setClinic(clinic);
        entry.setPatient(patient);
        entry.setDoctor(doctor);
        entry.setPreferredFrom(request.preferredFrom());
        entry.setPreferredTo(request.preferredTo());
        entry.setPreferredTimeOfDay(parseTimeOfDay(request.preferredTimeOfDay()));
        entry.setNotes(request.notes());
        entry.setStatus(WaitlistStatus.WAITING);
        waitlistRepository.save(entry);
        return toView(entry, countMatches(entry, openSlots(clinic.getId(), LocalDate.now(), LocalDate.now().plusDays(14))));
    }

    @Transactional
    public WaitlistView cancel(AuthPrincipal principal, Long id) {
        WaitlistEntry entry = require(principal.clinicId(), id);
        if (entry.getStatus() == WaitlistStatus.BOOKED) {
            throw ApiException.conflict("This waitlist request has already been filled.");
        }
        entry.setStatus(WaitlistStatus.CANCELLED);
        waitlistRepository.save(entry);
        return toView(entry, 0);
    }

    @Transactional(readOnly = true)
    public RecoveryQueueView recoveryQueue(Long clinicId, LocalDate from, LocalDate to) {
        List<OpenSlotView> slots = openSlots(clinicId, from, to);
        long waiting = waitlistRepository.countByClinicIdAndStatus(clinicId, WaitlistStatus.WAITING);
        return new RecoveryQueueView(slots, (int) waiting);
    }

    /**
     * Cancelled appointments whose slot is still in the future and still unfilled, paired
     * with the waitlist patients who would accept it.
     */
    @Transactional(readOnly = true)
    public List<OpenSlotView> openSlots(Long clinicId, LocalDate from, LocalDate to) {
        LocalDateTime fromAt = from.atStartOfDay();
        LocalDateTime toAt = to.plusDays(1).atStartOfDay();
        List<Appointment> cancelled = appointmentRepository.findCancelledInRange(clinicId, fromAt, toAt).stream()
                .filter(a -> a.getStartAt().isAfter(LocalDateTime.now()))
                .toList();
        if (cancelled.isEmpty()) {
            return List.of();
        }
        List<WaitlistEntry> waiting = waitlistRepository
                .findByClinicIdAndStatusOrderByCreatedAtAsc(clinicId, WaitlistStatus.WAITING);

        Map<String, List<SlotView>> availabilityCache = new HashMap<>();
        List<OpenSlotView> result = new ArrayList<>();
        for (Appointment appointment : cancelled) {
            String key = appointment.getDoctor().getId() + "@" + appointment.getStartAt().toLocalDate();
            List<SlotView> slots = availabilityCache.computeIfAbsent(key,
                    k -> availabilityService.slots(appointment.getDoctor(), appointment.getStartAt().toLocalDate()));
            boolean stillFree = slots.stream()
                    .anyMatch(s -> s.startAt().equals(appointment.getStartAt()) && s.available());
            if (!stillFree) {
                continue;
            }
            List<WaitlistView> matches = waiting.stream()
                    .filter(entry -> matches(entry, appointment))
                    .map(entry -> toView(entry, 1))
                    .toList();
            result.add(new OpenSlotView(
                    appointment.getId(),
                    new DoctorRef(appointment.getDoctor().getId(), appointment.getDoctor().getName(),
                            appointment.getDoctor().getSpecialty()),
                    new PatientRef(appointment.getPatient().getId(), appointment.getPatient().getName(),
                            appointment.getPatient().getPhone()),
                    appointment.getStartAt(),
                    appointment.getEndAt(),
                    appointment.getCancellationType() == null ? null : appointment.getCancellationType().name(),
                    appointment.getCancelledAt(),
                    matches));
        }
        return result;
    }

    @Transactional
    public com.clinicflow.web.dto.AppointmentDtos.AppointmentView offer(AuthPrincipal principal, Long entryId,
                                                                        OfferRequest request) {
        WaitlistEntry entry = require(principal.clinicId(), entryId);
        if (entry.getStatus() == WaitlistStatus.BOOKED) {
            throw ApiException.conflict("This waitlist request has already been filled.");
        }
        if (entry.getStatus() == WaitlistStatus.CANCELLED) {
            throw ApiException.conflict("This waitlist request was cancelled.");
        }
        Doctor doctor = request.doctorId() != null
                ? doctorRepository.findById(request.doctorId())
                        .filter(d -> d.getClinic().getId().equals(principal.clinicId()))
                        .orElseThrow(() -> ApiException.notFound("Doctor not found"))
                : entry.getDoctor();
        if (doctor == null) {
            throw ApiException.badRequest("Choose a doctor for this waitlist booking.");
        }
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));

        Appointment appointment = appointmentService.createAppointment(clinic, entry.getPatient(), doctor,
                request.startAt(), entry.getNotes(), AppointmentOrigin.WAITLIST);
        appointment.setRecovered(true);
        if (request.cancelledAppointmentId() != null) {
            Appointment cancelled = appointmentService.require(principal.clinicId(), request.cancelledAppointmentId());
            if (cancelled.getStatus() != AppointmentStatus.CANCELLED) {
                throw ApiException.badRequest("The slot being recovered was not cancelled.");
            }
            appointment.setRecoveredFromAppointmentId(cancelled.getId());
        } else {
            appointment.setRecoveredFromAppointmentId(null);
        }
        appointmentRepository.save(appointment);
        notificationService.scheduleFor(appointment);
        appointmentService.recordEvent(appointment, AppointmentEventType.WAITLIST_OFFERED, principal.name(),
                "Filled an open slot from the waitlist for " + entry.getPatient().getName());

        entry.setStatus(WaitlistStatus.BOOKED);
        entry.setResolvedAppointmentId(appointment.getId());
        waitlistRepository.save(entry);
        return assembler.toView(appointment, true);
    }

    private Map<Long, Integer> matchCounts(Long clinicId) {
        List<OpenSlotView> slots = openSlots(clinicId, LocalDate.now(), LocalDate.now().plusDays(14));
        Map<Long, Integer> counts = new HashMap<>();
        for (OpenSlotView slot : slots) {
            for (WaitlistView match : slot.matches()) {
                counts.merge(match.id(), 1, Integer::sum);
            }
        }
        return counts;
    }

    private int countMatches(WaitlistEntry entry, List<OpenSlotView> slots) {
        return (int) slots.stream().filter(s -> s.matches().stream().anyMatch(m -> m.id().equals(entry.getId()))).count();
    }

    private boolean matches(WaitlistEntry entry, Appointment appointment) {
        if (entry.getDoctor() != null && !entry.getDoctor().getId().equals(appointment.getDoctor().getId())) {
            return false;
        }
        LocalDate date = appointment.getStartAt().toLocalDate();
        if (entry.getPreferredFrom() != null && date.isBefore(entry.getPreferredFrom())) {
            return false;
        }
        if (entry.getPreferredTo() != null && date.isAfter(entry.getPreferredTo())) {
            return false;
        }
        int hour = appointment.getStartAt().getHour();
        return switch (entry.getPreferredTimeOfDay()) {
            case ANY -> true;
            case MORNING -> hour < 12;
            case AFTERNOON -> hour >= 12 && hour < 17;
            case EVENING -> hour >= 17;
        };
    }

    private WaitlistView toView(WaitlistEntry entry, int matchingOpenSlots) {
        return new WaitlistView(
                entry.getId(),
                new PatientRef(entry.getPatient().getId(), entry.getPatient().getName(), entry.getPatient().getPhone()),
                entry.getDoctor() == null ? null
                        : new DoctorRef(entry.getDoctor().getId(), entry.getDoctor().getName(),
                                entry.getDoctor().getSpecialty()),
                entry.getPreferredFrom(),
                entry.getPreferredTo(),
                entry.getPreferredTimeOfDay().name(),
                entry.getStatus().name(),
                entry.getNotes(),
                entry.getCreatedAt(),
                entry.getResolvedAppointmentId(),
                matchingOpenSlots);
    }

    private WaitlistEntry require(Long clinicId, Long id) {
        WaitlistEntry entry = waitlistRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Waitlist request not found"));
        if (!entry.getClinic().getId().equals(clinicId)) {
            throw ApiException.notFound("Waitlist request not found");
        }
        return entry;
    }

    private PreferredTimeOfDay parseTimeOfDay(String value) {
        if (value == null || value.isBlank()) {
            return PreferredTimeOfDay.ANY;
        }
        try {
            return PreferredTimeOfDay.valueOf(value.toUpperCase(Locale.ENGLISH));
        } catch (IllegalArgumentException ex) {
            return PreferredTimeOfDay.ANY;
        }
    }
}
