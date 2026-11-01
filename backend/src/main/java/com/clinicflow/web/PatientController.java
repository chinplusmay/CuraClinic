package com.clinicflow.web;

import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.service.PatientService;
import com.clinicflow.web.dto.PatientDtos.PatientDetail;
import com.clinicflow.web.dto.PatientDtos.PatientRequest;
import com.clinicflow.web.dto.PatientDtos.PatientView;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/patients")
public class PatientController {

    private final PatientService patientService;

    public PatientController(PatientService patientService) {
        this.patientService = patientService;
    }

    @GetMapping
    public List<PatientView> list(@AuthenticationPrincipal AuthPrincipal principal,
                                  @RequestParam(required = false) String q) {
        return patientService.search(principal.clinicId(), q);
    }

    @GetMapping("/{id}")
    public PatientDetail detail(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id) {
        return patientService.detail(principal.clinicId(), id);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public PatientView create(@AuthenticationPrincipal AuthPrincipal principal,
                              @Valid @RequestBody PatientRequest request) {
        return patientService.create(principal, request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('OWNER','RECEPTIONIST')")
    public PatientView update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable Long id,
                              @Valid @RequestBody PatientRequest request) {
        return patientService.update(principal, id, request);
    }
}
