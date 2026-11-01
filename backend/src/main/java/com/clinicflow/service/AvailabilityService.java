package com.clinicflow.service;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.domain.Doctor;
import com.clinicflow.domain.DoctorSchedule;
import com.clinicflow.domain.ScheduleBlock;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.DoctorRepository;
import com.clinicflow.repo.DoctorScheduleRepository;
import com.clinicflow.repo.ScheduleBlockRepository;
import com.clinicflow.web.dto.DoctorDtos.DoctorDayView;
import com.clinicflow.web.dto.DoctorDtos.SlotView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AvailabilityService {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final ScheduleBlockRepository blockRepository;
    private final AppointmentRepository appointmentRepository;

    public AvailabilityService(DoctorRepository doctorRepository,
                               DoctorScheduleRepository scheduleRepository,
                               ScheduleBlockRepository blockRepository,
                               AppointmentRepository appointmentRepository) {
        this.doctorRepository = doctorRepository;
        this.scheduleRepository = scheduleRepository;
        this.blockRepository = blockRepository;
        this.appointmentRepository = appointmentRepository;
    }

    public List<SlotView> slots(Doctor doctor, LocalDate date) {
        int isoDay = date.getDayOfWeek().getValue();
        List<DoctorSchedule> schedules = scheduleRepository
                .findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctor.getId()).stream()
                .filter(DoctorSchedule::isActive)
                .filter(s -> s.getDayOfWeek() == isoDay)
                .toList();

        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
        List<ScheduleBlock> blocks = blockRepository
                .findByDoctorIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAtAsc(doctor.getId(), dayEnd, dayStart);
        List<Appointment> booked = appointmentRepository
                .findByDoctorIdAndStartAtLessThanAndEndAtGreaterThanAndStatusNotOrderByStartAtAsc(
                        doctor.getId(), dayEnd, dayStart, AppointmentStatus.CANCELLED);

        List<SlotView> slots = new ArrayList<>();
        for (DoctorSchedule schedule : schedules) {
            LocalTime cursor = schedule.getStartTime();
            while (!cursor.plusMinutes(schedule.getSlotMinutes()).isAfter(schedule.getEndTime())) {
                LocalDateTime startAt = date.atTime(cursor);
                LocalDateTime endAt = startAt.plusMinutes(schedule.getSlotMinutes());
                Optional<Appointment> occupying = booked.stream()
                        .filter(a -> a.getStartAt().isBefore(endAt) && a.getEndAt().isAfter(startAt))
                        .findFirst();
                boolean blocked = blocks.stream().anyMatch(b -> b.getStartAt().isBefore(endAt) && b.getEndAt().isAfter(startAt));
                boolean past = startAt.isBefore(LocalDateTime.now());
                String state = occupying.isPresent() ? "BOOKED" : blocked ? "BLOCKED" : past ? "PAST" : "OPEN";
                slots.add(new SlotView(startAt, endAt, "OPEN".equals(state),
                        occupying.map(Appointment::getId).orElse(null), state));
                cursor = cursor.plusMinutes(schedule.getSlotMinutes());
            }
        }
        return slots;
    }

    public List<DoctorDayView> dayAvailability(Long clinicId, LocalDate date) {
        List<Doctor> doctors = doctorRepository.findByClinicIdAndActiveTrueOrderByNameAsc(clinicId);
        return doctors.stream()
                .map(d -> new DoctorDayView(d.getId(), d.getName(), d.getSpecialty(), slots(d, date)))
                .toList();
    }

    public Optional<SlotView> findSlot(Doctor doctor, LocalDateTime startAt) {
        return slots(doctor, startAt.toLocalDate()).stream()
                .filter(s -> s.startAt().equals(startAt.withSecond(0).withNano(0)))
                .findFirst();
    }

    /**
     * Ensures a proposed time lands on the doctor's working-hours grid and the slot is free.
     * Returns the slot so callers can derive the appointment end.
     */
    public SlotView requireBookableSlot(Doctor doctor, LocalDateTime startAt) {
        SlotView slot = findSlot(doctor, startAt)
                .orElseThrow(() -> com.clinicflow.web.ApiException.badRequest(
                        "That time is outside " + doctor.getName() + "'s working hours."));
        if (!slot.available()) {
            throw com.clinicflow.web.ApiException.conflict("That slot is already taken or blocked. Pick another time.");
        }
        if (!startAt.isAfter(LocalDateTime.now())) {
            throw com.clinicflow.web.ApiException.badRequest("Choose a time in the future.");
        }
        return slot;
    }
}
