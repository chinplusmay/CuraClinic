package com.clinicflow.web.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class PatientDtos {

    private PatientDtos() {
    }

    public record PatientView(
            Long id,
            String name,
            String phone,
            String email,
            String notes,
            LocalDateTime createdAt,
            LocalDateTime lastVisitAt,
            long totalAppointments,
            long noShowCount) {
    }

    public record PatientRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 40) String phone,
            @Email @Size(max = 190) String email,
            @Size(max = 500) String notes) {
    }

    public record PatientDetail(PatientView patient, List<AppointmentDtos.AppointmentView> appointments) {
    }
}
