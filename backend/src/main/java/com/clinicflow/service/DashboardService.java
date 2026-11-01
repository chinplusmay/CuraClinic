package com.clinicflow.service;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.domain.Clinic;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.WaitlistEntryRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.AppointmentDtos.AppointmentView;
import com.clinicflow.web.dto.DashboardDtos.AttentionItem;
import com.clinicflow.web.dto.DashboardDtos.DashboardView;
import com.clinicflow.web.dto.DashboardDtos.Kpis;
import com.clinicflow.web.dto.DoctorDtos.DoctorDayView;
import com.clinicflow.web.dto.DoctorDtos.SlotView;
import com.clinicflow.web.dto.WaitlistDtos.OpenSlotView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardService {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH);

    private final AppointmentRepository appointmentRepository;
    private final ClinicRepository clinicRepository;
    private final WaitlistEntryRepository waitlistRepository;
    private final AvailabilityService availabilityService;
    private final WaitlistService waitlistService;
    private final AppointmentAssembler assembler;

    public DashboardService(AppointmentRepository appointmentRepository,
                            ClinicRepository clinicRepository,
                            WaitlistEntryRepository waitlistRepository,
                            AvailabilityService availabilityService,
                            WaitlistService waitlistService,
                            AppointmentAssembler assembler) {
        this.appointmentRepository = appointmentRepository;
        this.clinicRepository = clinicRepository;
        this.waitlistRepository = waitlistRepository;
        this.availabilityService = availabilityService;
        this.waitlistService = waitlistService;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public DashboardView forDate(AuthPrincipal principal, LocalDate date) {
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));

        List<Appointment> dayAppointments = appointmentRepository
                .findByClinicIdAndStartAtBetweenOrderByStartAtAsc(clinic.getId(),
                        date.atStartOfDay(), date.plusDays(1).atStartOfDay());
        List<Appointment> active = dayAppointments.stream()
                .filter(a -> a.getStatus() != AppointmentStatus.CANCELLED)
                .toList();
        List<AppointmentView> agenda = assembler.toViews(active, false);
        Map<Long, AppointmentView> viewsById = new HashMap<>();
        agenda.forEach(v -> viewsById.put(v.id(), v));

        long confirmed = active.stream().filter(a -> a.getConfirmedAt() != null).count();
        long unconfirmed = active.stream()
                .filter(a -> a.getConfirmedAt() == null && a.getStatus() == AppointmentStatus.SCHEDULED)
                .count();
        long completed = active.stream().filter(a -> a.getStatus() == AppointmentStatus.COMPLETED).count();
        long noShow = active.stream().filter(a -> a.getStatus() == AppointmentStatus.NO_SHOW).count();
        long cancelled = dayAppointments.size() - active.size();

        int bookedMinutes = active.stream()
                .mapToInt(a -> (int) Duration.between(a.getStartAt(), a.getEndAt()).toMinutes()).sum();
        List<DoctorDayView> availability = availabilityService.dayAvailability(clinic.getId(), date);
        int openSlots = 0;
        int availableMinutes = 0;
        for (DoctorDayView doctor : availability) {
            for (SlotView slot : doctor.slots()) {
                availableMinutes += (int) Duration.between(slot.startAt(), slot.endAt()).toMinutes();
                if (slot.available()) {
                    openSlots++;
                }
            }
        }

        long waiting = waitlistRepository.countByClinicIdAndStatus(clinic.getId(),
                com.clinicflow.domain.WaitlistStatus.WAITING);
        long recoveredThisMonth = appointmentRepository.countRecoveredSince(clinic.getId(),
                LocalDate.now().withDayOfMonth(1).atStartOfDay());

        Kpis kpis = new Kpis(active.size(), (int) confirmed, (int) unconfirmed, (int) completed, (int) noShow,
                (int) cancelled, openSlots, bookedMinutes, availableMinutes, waiting, recoveredThisMonth);

        List<OpenSlotView> recoveryQueue = waitlistService.openSlots(clinic.getId(), date, date.plusDays(2));
        List<AttentionItem> attention = new ArrayList<>();
        LocalDateTime cutoff = LocalDateTime.now().plusHours(24);
        for (AppointmentView view : agenda) {
            if (!view.confirmed() && "SCHEDULED".equals(view.status())
                    && view.startAt().isAfter(LocalDateTime.now())
                    && view.startAt().isBefore(cutoff)) {
                attention.add(new AttentionItem("UNCONFIRMED",
                        "Unconfirmed visit at " + TIME.format(view.startAt()) + " with " + view.patient().name(),
                        view));
            }
        }
        for (OpenSlotView slot : recoveryQueue) {
            if (!slot.matches().isEmpty()) {
                attention.add(new AttentionItem("OPEN_SLOT",
                        "Freed slot " + TIME.format(slot.startAt()) + " with Dr. " + slot.doctor().name() + " — "
                                + slot.matches().size() + " waitlist match"
                                + (slot.matches().size() == 1 ? "" : "es"),
                        viewsById.get(slot.cancelledAppointmentId())));
            }
        }
        for (AppointmentView view : agenda) {
            if ("NO_SHOW".equals(view.status())) {
                attention.add(new AttentionItem("NO_SHOW",
                        view.patient().name() + " missed the " + TIME.format(view.startAt()) + " visit — call to rebook",
                        view));
            }
        }
        if (waiting > 0) {
            attention.add(new AttentionItem("WAITLIST",
                    waiting + " patient" + (waiting == 1 ? "" : "s") + " waiting for an earlier appointment", null));
        }

        return new DashboardView(date, clinic.getName(), clinic.getTimezone(), kpis, agenda,
                attention.stream().limit(8).toList(),
                recoveryQueue.stream().limit(6).toList());
    }
}
