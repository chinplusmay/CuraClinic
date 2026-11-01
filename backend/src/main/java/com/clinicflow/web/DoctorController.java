package com.clinicflow.web;

import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.service.AvailabilityService;
import com.clinicflow.service.DoctorService;
import com.clinicflow.web.dto.DoctorDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api")
public class DoctorController {

    private final DoctorService doctorService;
    private final AvailabilityService availabilityService;

    public DoctorController(DoctorService doctorService, AvailabilityService availabilityService) {
        this.doctorService = doctorService;
        this.availabilityService = availabilityService;
    }

    @GetMapping("/doctors")
    public List<DoctorView> list(@AuthenticationPrincipal AuthPrincipal principal) {
        return doctorService.list(principal.clinicId());
    }

    @GetMapping("/doctors/{id}")
    public DoctorView get(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return doctorService.get(principal.clinicId(), id);
    }

    @PostMapping("/doctors")
    @PreAuthorize("hasRole('OWNER')")
    public DoctorView create(@AuthenticationPrincipal AuthPrincipal principal,
                             @Valid @RequestBody DoctorRequest request) {
        return doctorService.create(principal, request);
    }

    @PutMapping("/doctors/{id}")
    @PreAuthorize("hasRole('OWNER')")
    public DoctorView update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                             @Valid @RequestBody DoctorRequest request) {
        return doctorService.update(principal, id, request);
    }

    @PutMapping("/doctors/{id}/schedules")
    @PreAuthorize("hasRole('OWNER')")
    public DoctorView replaceSchedules(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                       @Valid @RequestBody List<ScheduleInput> schedules) {
        return doctorService.replaceSchedules(principal, id, schedules);
    }

    @PostMapping("/doctors/{id}/blocks")
    @PreAuthorize("hasRole('OWNER')")
    public DoctorView addBlock(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                               @Valid @RequestBody BlockRequest request) {
        return doctorService.addBlock(principal, id, request);
    }

    @DeleteMapping("/doctors/{id}/blocks/{blockId}")
    @PreAuthorize("hasRole('OWNER')")
    public DoctorView removeBlock(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                                  @PathVariable Long blockId) {
        return doctorService.removeBlock(principal, id, blockId);
    }

    @GetMapping("/availability")
    public AvailabilityView availability(@AuthenticationPrincipal AuthPrincipal principal,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        LocalDate target = date == null ? LocalDate.now() : date;
        return new AvailabilityView(target.toString(), availabilityService.dayAvailability(principal.clinicId(), target));
    }
}
