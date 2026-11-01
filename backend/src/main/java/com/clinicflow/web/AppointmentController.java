package com.clinicflow.web;

import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.service.AppointmentService;
import com.clinicflow.web.dto.AppointmentDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @GetMapping
    public List<AppointmentView> search(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long doctorId,
            @RequestParam(required = false) List<String> status) {
        LocalDate start = from == null ? LocalDate.now().minusDays(7) : from;
        LocalDate end = to == null ? LocalDate.now().plusDays(30) : to;
        List<AppointmentStatus> statuses = status == null || status.isEmpty() ? null
                : status.stream()
                        .filter(s -> s != null && !s.isBlank())
                        .map(s -> AppointmentStatus.valueOf(s.toUpperCase(Locale.ENGLISH)))
                        .toList();
        return appointmentService.search(principal.clinicId(), start.atStartOfDay(),
                end.plusDays(1).atStartOfDay(), doctorId, statuses);
    }

    @GetMapping("/{id}")
    public AppointmentView get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return appointmentService.get(principal.clinicId(), id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public AppointmentView book(@AuthenticationPrincipal AuthPrincipal principal,
                                @Valid @RequestBody BookRequest request) {
        return appointmentService.book(principal, request);
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public AppointmentView reschedule(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                      @Valid @RequestBody RescheduleRequest request) {
        return appointmentService.reschedule(principal, id, request);
    }

    @PatchMapping("/{id}/status")
    public AppointmentView updateStatus(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                        @Valid @RequestBody StatusRequest request) {
        return appointmentService.updateStatus(principal, id, request);
    }

    @PostMapping("/{id}/confirm")
    public AppointmentView confirm(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return appointmentService.confirm(principal, id);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public AppointmentView cancel(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                  @Valid @RequestBody CancelRequest request) {
        return appointmentService.cancel(principal, id, request);
    }

    @PostMapping("/{id}/reminder")
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public AppointmentView sendReminder(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                        @RequestBody(required = false) ReminderRequest request) {
        return appointmentService.sendReminder(principal, id, request == null ? new ReminderRequest(null) : request);
    }
}
