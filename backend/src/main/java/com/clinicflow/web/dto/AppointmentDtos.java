package com.clinicflow.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class AppointmentDtos {

    private AppointmentDtos() {
    }

    public record PatientRef(Long id, String name, String phone) {
    }

    public record DoctorRef(Long id, String name, String specialty) {
    }

    public record NotificationView(
            Long id,
            String type,
            String channel,
            String status,
            String recipient,
            LocalDateTime scheduledAt,
            LocalDateTime sentAt,
            String error) {
    }

    public record EventView(
            Long id,
            String type,
            LocalDateTime occurredAt,
            String actor,
            String note) {
    }

    public record AppointmentView(
            Long id,
            PatientRef patient,
            DoctorRef doctor,
            LocalDateTime startAt,
            LocalDateTime endAt,
            String status,
            String origin,
            boolean confirmed,
            String reason,
            boolean recovered,
            Long recoveredFromAppointmentId,
            String cancellationType,
            LocalDateTime cancelledAt,
            String cancelledBy,
            String cancellationReason,
            List<NotificationView> notifications,
            List<EventView> events) {
    }

    public record BookRequest(
            @NotNull Long patientId,
            @NotNull Long doctorId,
            @NotNull LocalDateTime startAt,
            @Size(max = 255) String reason,
            String origin) {
    }

    public record RescheduleRequest(
            @NotNull LocalDateTime startAt,
            Long doctorId) {
    }

    public record StatusRequest(
            @NotBlank String status,
            @Size(max = 500) String note) {
    }

    public record CancelRequest(
            @NotBlank String cancellationType,
            @Size(max = 255) String reason) {
    }

    public record ReminderRequest(String type) {
    }
}
