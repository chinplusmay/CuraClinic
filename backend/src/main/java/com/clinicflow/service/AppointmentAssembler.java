package com.clinicflow.service;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentEvent;
import com.clinicflow.domain.Notification;
import com.clinicflow.repo.AppointmentEventRepository;
import com.clinicflow.repo.NotificationRepository;
import com.clinicflow.web.dto.AppointmentDtos.AppointmentView;
import com.clinicflow.web.dto.AppointmentDtos.DoctorRef;
import com.clinicflow.web.dto.AppointmentDtos.EventView;
import com.clinicflow.web.dto.AppointmentDtos.NotificationView;
import com.clinicflow.web.dto.AppointmentDtos.PatientRef;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class AppointmentAssembler {

    private final NotificationRepository notificationRepository;
    private final AppointmentEventRepository eventRepository;

    public AppointmentAssembler(NotificationRepository notificationRepository,
                                AppointmentEventRepository eventRepository) {
        this.notificationRepository = notificationRepository;
        this.eventRepository = eventRepository;
    }

    public AppointmentView toView(Appointment appointment, boolean includeEvents) {
        return toViews(List.of(appointment), includeEvents).get(0);
    }

    public List<AppointmentView> toViews(List<Appointment> appointments, boolean includeEvents) {
        if (appointments.isEmpty()) {
            return List.of();
        }
        List<Long> ids = appointments.stream().map(Appointment::getId).toList();

        Map<Long, List<Notification>> notifications = notificationRepository
                .findByAppointmentIdInOrderByScheduledAtAsc(ids).stream()
                .collect(Collectors.groupingBy(n -> n.getAppointment().getId()));

        Map<Long, List<AppointmentEvent>> events = includeEvents
                ? eventRepository.findByAppointmentIdInOrderByOccurredAtAscIdAsc(ids).stream()
                        .collect(Collectors.groupingBy(e -> e.getAppointment().getId()))
                : Map.of();

        List<AppointmentView> views = new ArrayList<>(appointments.size());
        for (Appointment a : appointments) {
            views.add(new AppointmentView(
                    a.getId(),
                    new PatientRef(a.getPatient().getId(), a.getPatient().getName(), a.getPatient().getPhone()),
                    new DoctorRef(a.getDoctor().getId(), a.getDoctor().getName(), a.getDoctor().getSpecialty()),
                    a.getStartAt(),
                    a.getEndAt(),
                    a.getStatus().name(),
                    a.getOrigin().name(),
                    a.getConfirmedAt() != null,
                    a.getReason(),
                    a.isRecovered(),
                    a.getRecoveredFromAppointmentId(),
                    a.getCancellationType() == null ? null : a.getCancellationType().name(),
                    a.getCancelledAt(),
                    a.getCancelledBy(),
                    a.getCancellationReason(),
                    notificationViews(notifications.getOrDefault(a.getId(), List.of())),
                    eventViews(events.getOrDefault(a.getId(), List.of()))));
        }
        return views;
    }

    private List<NotificationView> notificationViews(List<Notification> notifications) {
        if (notifications == null || notifications.isEmpty()) {
            return Collections.emptyList();
        }
        return notifications.stream()
                .map(n -> new NotificationView(
                        n.getId(),
                        n.getType().name(),
                        n.getChannel().name(),
                        n.getStatus().name(),
                        n.getRecipient(),
                        n.getScheduledAt(),
                        n.getSentAt(),
                        n.getError()))
                .toList();
    }

    private List<EventView> eventViews(List<AppointmentEvent> events) {
        if (events == null || events.isEmpty()) {
            return Collections.emptyList();
        }
        return events.stream()
                .map(e -> new EventView(
                        e.getId(),
                        e.getEventType().name(),
                        e.getOccurredAt(),
                        e.getActor(),
                        e.getNote()))
                .toList();
    }
}
