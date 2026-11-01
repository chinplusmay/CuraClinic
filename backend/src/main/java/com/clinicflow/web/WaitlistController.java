package com.clinicflow.web;

import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.service.WaitlistService;
import com.clinicflow.web.dto.AppointmentDtos.AppointmentView;
import com.clinicflow.web.dto.WaitlistDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/waitlist")
public class WaitlistController {

    private final WaitlistService waitlistService;

    public WaitlistController(WaitlistService waitlistService) {
        this.waitlistService = waitlistService;
    }

    @GetMapping
    public List<WaitlistView> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return waitlistService.list(principal.clinicId());
    }

    @GetMapping("/recovery")
    public RecoveryQueueView recovery(@AuthenticationPrincipal AuthPrincipal principal,
                                      @RequestParam(required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                      @RequestParam(required = false)
                                      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate start = from == null ? LocalDate.now() : from;
        LocalDate end = to == null ? LocalDate.now().plusDays(7) : to;
        return waitlistService.recoveryQueue(principal.clinicId(), start, end);
    }

    @PostMapping
    public WaitlistView add(@AuthenticationPrincipal AuthPrincipal principal,
                            @Valid @RequestBody WaitlistRequest request) {
        return waitlistService.add(principal, request);
    }

    @PatchMapping("/{id}/cancel")
    public WaitlistView cancel(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return waitlistService.cancel(principal, id);
    }

    @PostMapping("/{id}/offer")
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public AppointmentView offer(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                 @Valid @RequestBody OfferRequest request) {
        return waitlistService.offer(principal, id, request);
    }
}
