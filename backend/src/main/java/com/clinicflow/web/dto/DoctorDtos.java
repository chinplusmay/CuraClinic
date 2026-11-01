package com.clinicflow.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public final class DoctorDtos {

    private DoctorDtos() {
    }

    public record ScheduleView(
            Long id,
            int dayOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            int slotMinutes,
            boolean active) {
    }

    public record ScheduleInput(
            @NotNull @Min(1) @Max(7) Integer dayOfWeek,
            @NotNull LocalTime startTime,
            @NotNull LocalTime endTime,
            @NotNull @Min(5) @Max(120) Integer slotMinutes,
            Boolean active) {
    }

    public record BlockView(Long id, LocalDateTime startAt, LocalDateTime endAt, String reason) {
    }

    public record BlockRequest(
            @NotNull LocalDateTime startAt,
            @NotNull LocalDateTime endAt,
            @Size(max = 160) String reason) {
    }

    public record DoctorRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 120) String specialty,
            Boolean active) {
    }

    public record DoctorView(
            Long id,
            String name,
            String specialty,
            boolean active,
            List<ScheduleView> schedules,
            List<BlockView> blocks) {
    }

    public record SlotView(
            LocalDateTime startAt,
            LocalDateTime endAt,
            boolean available,
            Long appointmentId,
            String state) {
    }

    public record DoctorDayView(
            Long doctorId,
            String doctorName,
            String specialty,
            List<SlotView> slots) {
    }

    public record AvailabilityView(String date, List<DoctorDayView> doctors) {
    }
}
