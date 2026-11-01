package com.clinicflow.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class WaitlistDtos {

    private WaitlistDtos() {
    }

    public record WaitlistView(
            Long id,
            AppointmentDtos.PatientRef patient,
            AppointmentDtos.DoctorRef doctor,
            LocalDate preferredFrom,
            LocalDate preferredTo,
            String preferredTimeOfDay,
            String status,
            String notes,
            LocalDateTime createdAt,
            Long resolvedAppointmentId,
            int matchingOpenSlots) {
    }

    public record WaitlistRequest(
            @NotNull Long patientId,
            Long doctorId,
            LocalDate preferredFrom,
            LocalDate preferredTo,
            String preferredTimeOfDay,
            @Size(max = 255) String notes) {
    }

    public record OfferRequest(
            @NotNull LocalDateTime startAt,
            Long doctorId,
            Long cancelledAppointmentId) {
    }

    public record OpenSlotView(
            Long cancelledAppointmentId,
            AppointmentDtos.DoctorRef doctor,
            AppointmentDtos.PatientRef cancelledPatient,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String cancellationType,
            LocalDateTime cancelledAt,
            List<WaitlistView> matches) {
    }

    public record RecoveryQueueView(List<OpenSlotView> openSlots, int waitingPatients) {
    }
}
