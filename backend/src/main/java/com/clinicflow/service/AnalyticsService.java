package com.clinicflow.service;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.domain.CancellationType;
import com.clinicflow.domain.Doctor;
import com.clinicflow.domain.DoctorSchedule;
import com.clinicflow.domain.Notification;
import com.clinicflow.domain.NotificationStatus;
import com.clinicflow.domain.ScheduleBlock;
import com.clinicflow.domain.Clinic;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.DoctorRepository;
import com.clinicflow.repo.DoctorScheduleRepository;
import com.clinicflow.repo.NotificationRepository;
import com.clinicflow.repo.ScheduleBlockRepository;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.AnalyticsDtos.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final AppointmentRepository appointmentRepository;
    private final NotificationRepository notificationRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final ScheduleBlockRepository blockRepository;
    private final ClinicRepository clinicRepository;

    public AnalyticsService(AppointmentRepository appointmentRepository,
                            NotificationRepository notificationRepository,
                            DoctorRepository doctorRepository,
                            DoctorScheduleRepository scheduleRepository,
                            ScheduleBlockRepository blockRepository,
                            ClinicRepository clinicRepository) {
        this.appointmentRepository = appointmentRepository;
        this.notificationRepository = notificationRepository;
        this.doctorRepository = doctorRepository;
        this.scheduleRepository = scheduleRepository;
        this.blockRepository = blockRepository;
        this.clinicRepository = clinicRepository;
    }

    /**
     * Aggregate-only snapshot used by the public landing page. Contains no patient data.
     */
    @Transactional(readOnly = true)
    public PublicSnapshot publicSnapshot() {
        Clinic clinic = clinicRepository.findAll().stream().findFirst().orElse(null);
        if (clinic == null) {
            return new PublicSnapshot("Demo clinic", 30, 0, 0, 0, 0, 0, 0);
        }
        LocalDate to = LocalDate.now();
        AnalyticsView view = overview(clinic.getId(), to.minusDays(29), to);
        return new PublicSnapshot(clinic.getName(), 30, view.rates().noShowRate(), view.rates().slotRecoveryRate(),
                view.rates().reminderDeliveryRate(), view.rates().utilization(),
                view.totals().recovered(), view.totals().booked());
    }

    @Transactional(readOnly = true)
    public AnalyticsView overview(Long clinicId, LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            to = LocalDate.now();
            from = to.minusDays(29);
        }
        if (to.isBefore(from)) {
            throw ApiException.badRequest("The end date must be on or after the start date.");
        }
        if (ChronoUnit.DAYS.between(from, to) > 366) {
            throw ApiException.badRequest("Choose a range of up to one year.");
        }
        LocalDateTime fromAt = from.atStartOfDay();
        LocalDateTime toAt = to.plusDays(1).atStartOfDay();
        int days = (int) ChronoUnit.DAYS.between(from, to) + 1;

        List<Appointment> appointments = appointmentRepository
                .findByClinicIdAndStartAtGreaterThanEqualAndStartAtLessThanOrderByStartAtAsc(clinicId, fromAt, toAt);
        List<Notification> notifications = notificationRepository
                .findByClinicAndScheduledRange(clinicId, fromAt, toAt);

        int booked = appointments.size();
        int completed = count(appointments, AppointmentStatus.COMPLETED);
        int noShow = count(appointments, AppointmentStatus.NO_SHOW);
        int cancelled = count(appointments, AppointmentStatus.CANCELLED);
        int recovered = (int) appointments.stream().filter(Appointment::isRecovered).count();
        int eligible = completed + noShow;
        int confirmed = (int) appointments.stream()
                .filter(a -> a.getConfirmedAt() != null && a.getStatus() != AppointmentStatus.CANCELLED)
                .count();
        int patientLate = countCancellations(appointments, CancellationType.PATIENT_LATE);
        int patientAdvance = countCancellations(appointments, CancellationType.PATIENT_ADVANCE);
        int clinicCancelled = countCancellations(appointments, CancellationType.CLINIC);
        int recoverableCancellations = patientLate + patientAdvance;

        int sent = (int) notifications.stream().filter(n -> n.getStatus() == NotificationStatus.SENT).count();
        int failed = (int) notifications.stream().filter(n -> n.getStatus() == NotificationStatus.FAILED).count();
        int pending = (int) notifications.stream().filter(n -> n.getStatus() == NotificationStatus.PENDING).count();

        List<Doctor> doctors = doctorRepository.findByClinicIdAndActiveTrueOrderByNameAsc(clinicId);
        Map<Long, Integer> bookedMinutesByDoctor = new HashMap<>();
        for (Appointment appointment : appointments) {
            if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
                continue;
            }
            int minutes = (int) Duration.between(appointment.getStartAt(), appointment.getEndAt()).toMinutes();
            bookedMinutesByDoctor.merge(appointment.getDoctor().getId(), minutes, Integer::sum);
        }
        Map<Long, Integer> capacityByDoctor = capacityMinutes(doctors, from, to);
        int totalCapacity = capacityByDoctor.values().stream().mapToInt(Integer::intValue).sum();
        int totalBookedMinutes = bookedMinutesByDoctor.values().stream().mapToInt(Integer::intValue).sum();

        Rates rates = new Rates(
                ratio(noShow, eligible),
                ratio(cancelled, booked),
                ratio(completed, eligible),
                ratio(recovered, recoverableCancellations),
                ratio(totalBookedMinutes, totalCapacity),
                ratio(sent, sent + failed),
                ratio(confirmed, booked - cancelled));

        Totals totals = new Totals(booked, completed, noShow, cancelled, recovered, eligible, sent, sent + failed);

        CancellationBreakdown breakdown = new CancellationBreakdown(patientLate, patientAdvance, clinicCancelled, noShow);

        Map<String, Integer> byType = new LinkedHashMap<>();
        for (String type : List.of("CONFIRMATION", "REMINDER_24H", "REMINDER_2H", "FOLLOW_UP")) {
            byType.put(type, 0);
        }
        for (Notification notification : notifications) {
            byType.merge(notification.getType().name(), 1, Integer::sum);
        }
        ReminderStats reminderStats = new ReminderStats(notifications.size(), sent, failed, pending, byType);

        Map<LocalDate, List<Appointment>> byDay = appointments.stream()
                .collect(Collectors.groupingBy(a -> a.getStartAt().toLocalDate(), TreeMap::new, Collectors.toList()));
        List<TrendPoint> trend = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            List<Appointment> dayAppointments = byDay.getOrDefault(date, List.of());
            trend.add(new TrendPoint(date,
                    dayAppointments.size(),
                    count(dayAppointments, AppointmentStatus.COMPLETED),
                    count(dayAppointments, AppointmentStatus.NO_SHOW),
                    count(dayAppointments, AppointmentStatus.CANCELLED),
                    (int) dayAppointments.stream().filter(Appointment::isRecovered).count()));
        }

        List<DoctorPerformance> byDoctor = new ArrayList<>();
        for (Doctor doctor : doctors) {
            List<Appointment> doctorAppointments = appointments.stream()
                    .filter(a -> a.getDoctor().getId().equals(doctor.getId()))
                    .toList();
            int dCompleted = count(doctorAppointments, AppointmentStatus.COMPLETED);
            int dNoShow = count(doctorAppointments, AppointmentStatus.NO_SHOW);
            int dCancelled = count(doctorAppointments, AppointmentStatus.CANCELLED);
            byDoctor.add(new DoctorPerformance(
                    doctor.getId(),
                    doctor.getName(),
                    doctor.getSpecialty(),
                    doctorAppointments.size(),
                    dCompleted,
                    dNoShow,
                    dCancelled,
                    ratio(dNoShow, dCompleted + dNoShow),
                    ratio(bookedMinutesByDoctor.getOrDefault(doctor.getId(), 0),
                            capacityByDoctor.getOrDefault(doctor.getId(), 0))));
        }

        Map<String, Integer> sources = new HashMap<>();
        for (Appointment appointment : appointments) {
            sources.merge(appointment.getOrigin().name(), 1, Integer::sum);
        }
        List<SourceBreakdown> bySource = sources.entrySet().stream()
                .sorted((a, b) -> b.getValue().compareTo(a.getValue()))
                .map(e -> new SourceBreakdown(e.getKey(), e.getValue()))
                .toList();

        return new AnalyticsView(from, to, days, totals, rates, breakdown, reminderStats, trend, byDoctor, bySource);
    }

    private int count(List<Appointment> appointments, AppointmentStatus status) {
        return (int) appointments.stream().filter(a -> a.getStatus() == status).count();
    }

    private int countCancellations(List<Appointment> appointments, CancellationType type) {
        return (int) appointments.stream().filter(a -> a.getCancellationType() == type).count();
    }

    private double ratio(int numerator, int denominator) {
        if (denominator <= 0) {
            return 0.0;
        }
        return Math.round((double) numerator / denominator * 10000.0) / 10000.0;
    }

    private Map<Long, Integer> capacityMinutes(List<Doctor> doctors, LocalDate from, LocalDate to) {
        Map<Long, Integer> capacity = new HashMap<>();
        if (doctors.isEmpty()) {
            return capacity;
        }
        List<Long> doctorIds = doctors.stream().map(Doctor::getId).toList();
        Map<Long, List<DoctorSchedule>> schedulesByDoctor = scheduleRepository
                .findByDoctorIdInAndActiveTrue(doctorIds).stream()
                .collect(Collectors.groupingBy(s -> s.getDoctor().getId()));
        LocalDateTime fromAt = from.atStartOfDay();
        LocalDateTime toAt = to.plusDays(1).atStartOfDay();
        List<ScheduleBlock> blocks = blockRepository
                .findByDoctorIdInAndStartAtLessThanAndEndAtGreaterThanOrderByStartAtAsc(doctorIds, toAt, fromAt);

        for (Doctor doctor : doctors) {
            int minutes = 0;
            List<DoctorSchedule> schedules = schedulesByDoctor.getOrDefault(doctor.getId(), List.of());
            for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
                int isoDay = date.getDayOfWeek().getValue();
                for (DoctorSchedule schedule : schedules) {
                    if (schedule.getDayOfWeek() == isoDay) {
                        minutes += (int) Duration.between(schedule.getStartTime(), schedule.getEndTime()).toMinutes();
                    }
                }
            }
            int blocked = 0;
            for (ScheduleBlock block : blocks) {
                if (!block.getDoctor().getId().equals(doctor.getId())) {
                    continue;
                }
                LocalDateTime start = block.getStartAt().isBefore(fromAt) ? fromAt : block.getStartAt();
                LocalDateTime end = block.getEndAt().isAfter(toAt) ? toAt : block.getEndAt();
                if (end.isAfter(start)) {
                    blocked += (int) Duration.between(start, end).toMinutes();
                }
            }
            capacity.put(doctor.getId(), Math.max(0, minutes - blocked));
        }
        return capacity;
    }
}
