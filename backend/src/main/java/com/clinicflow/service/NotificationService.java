package com.clinicflow.service;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentEvent;
import com.clinicflow.domain.AppointmentEventType;
import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.domain.Notification;
import com.clinicflow.domain.NotificationChannel;
import com.clinicflow.domain.NotificationStatus;
import com.clinicflow.domain.NotificationType;
import com.clinicflow.repo.AppointmentEventRepository;
import com.clinicflow.repo.NotificationRepository;
import com.clinicflow.web.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter WHEN = DateTimeFormatter.ofPattern("EEE d MMM, h:mm a", Locale.ENGLISH);

    private final NotificationRepository notificationRepository;
    private final AppointmentEventRepository eventRepository;
    private final NotificationGateway gateway;

    public NotificationService(NotificationRepository notificationRepository,
                               AppointmentEventRepository eventRepository,
                               NotificationGateway gateway) {
        this.notificationRepository = notificationRepository;
        this.eventRepository = eventRepository;
        this.gateway = gateway;
    }

    @Transactional
    public void scheduleFor(Appointment appointment) {
        cancelPending(appointment);
        NotificationChannel channel = appointment.getPatient().getEmail() != null
                && !appointment.getPatient().getEmail().isBlank()
                ? NotificationChannel.EMAIL
                : NotificationChannel.SMS;
        String recipient = channel == NotificationChannel.EMAIL
                ? appointment.getPatient().getEmail()
                : appointment.getPatient().getPhone();

        LocalDateTime now = LocalDateTime.now();
        create(appointment, NotificationType.CONFIRMATION, channel, recipient, now);

        LocalDateTime reminder24 = appointment.getStartAt().minusHours(24);
        if (reminder24.isAfter(now)) {
            create(appointment, NotificationType.REMINDER_24H, channel, recipient, reminder24);
        }
        LocalDateTime reminder2 = appointment.getStartAt().minusHours(2);
        if (reminder2.isAfter(now)) {
            create(appointment, NotificationType.REMINDER_2H, channel, recipient, reminder2);
        }
    }

    private Notification create(Appointment appointment, NotificationType type, NotificationChannel channel,
                                String recipient, LocalDateTime scheduledAt) {
        Notification notification = new Notification();
        notification.setAppointment(appointment);
        notification.setType(type);
        notification.setChannel(channel);
        notification.setRecipient(recipient);
        notification.setScheduledAt(scheduledAt);
        notification.setStatus(NotificationStatus.PENDING);
        notification.setBody(body(appointment, type));
        return notificationRepository.save(notification);
    }

    private String body(Appointment appointment, NotificationType type) {
        String greeting = "Hi " + appointment.getPatient().getName() + ", ";
        String when = WHEN.format(appointment.getStartAt());
        String who = "Dr. " + appointment.getDoctor().getName();
        return switch (type) {
            case CONFIRMATION -> greeting + "your appointment with " + who + " is booked for " + when
                    + ". Reply YES to confirm or call the clinic to reschedule.";
            case REMINDER_24H -> greeting + "reminder: " + who + " tomorrow at " + when
                    + ". Reply YES to confirm. Need to change it? Call the clinic.";
            case REMINDER_2H -> greeting + "your appointment with " + who + " is in 2 hours (" + when
                    + "). Please arrive 10 minutes early.";
            case FOLLOW_UP -> greeting + "thank you for visiting us today. Reply if you need help with your next step.";
        };
    }

    @Transactional
    public int dispatchDue() {
        LocalDateTime now = LocalDateTime.now();
        List<Notification> due = notificationRepository
                .findByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(NotificationStatus.PENDING, now);
        int sent = 0;
        for (Notification notification : due) {
            if (dispatch(notification)) {
                sent++;
            }
        }
        return sent;
    }

    @Transactional
    public NotificationView sendNow(Appointment appointment, NotificationType type) {
        NotificationChannel channel = appointment.getPatient().getEmail() != null
                && !appointment.getPatient().getEmail().isBlank()
                ? NotificationChannel.EMAIL
                : NotificationChannel.SMS;
        String recipient = channel == NotificationChannel.EMAIL
                ? appointment.getPatient().getEmail()
                : appointment.getPatient().getPhone();
        Notification notification = create(appointment, type, channel, recipient, LocalDateTime.now());
        dispatch(notification);
        return toView(notification);
    }

    private boolean dispatch(Notification notification) {
        Appointment appointment = notification.getAppointment();
        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.NO_SHOW
                || appointment.getStatus() == AppointmentStatus.COMPLETED) {
            notification.setStatus(NotificationStatus.CANCELLED);
            notificationRepository.save(notification);
            return false;
        }
        try {
            gateway.deliver(notification);
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(LocalDateTime.now());
            notification.setError(null);
            notificationRepository.save(notification);

            AppointmentEvent event = new AppointmentEvent();
            event.setAppointment(appointment);
            event.setEventType(AppointmentEventType.REMINDER_SENT);
            event.setOccurredAt(LocalDateTime.now());
            event.setActor("ClinicFlow");
            event.setNote(notification.getType() + " via " + notification.getChannel());
            eventRepository.save(event);
            return true;
        } catch (Exception ex) {
            log.warn("Notification {} failed: {}", notification.getId(), ex.getMessage());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setError(trim(ex.getMessage()));
            notificationRepository.save(notification);
            return false;
        }
    }

    @Transactional
    public void cancelPending(Appointment appointment) {
        List<Notification> pending = notificationRepository
                .findByAppointmentIdAndStatus(appointment.getId() == null ? -1L : appointment.getId(), NotificationStatus.PENDING);
        for (Notification notification : pending) {
            notification.setStatus(NotificationStatus.CANCELLED);
        }
        notificationRepository.saveAll(pending);
    }

    @Transactional(readOnly = true)
    public List<NotificationView> forAppointment(Long appointmentId) {
        return notificationRepository.findByAppointmentIdOrderByScheduledAtAsc(appointmentId).stream()
                .map(this::toView)
                .toList();
    }

    private NotificationView toView(Notification n) {
        return new NotificationView(n.getId(), n.getType().name(), n.getChannel().name(), n.getStatus().name(),
                n.getRecipient(), n.getScheduledAt(), n.getSentAt(), n.getError());
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }
        return value.length() > 250 ? value.substring(0, 250) : value;
    }

    public record NotificationView(Long id, String type, String channel, String status, String recipient,
                                   LocalDateTime scheduledAt, LocalDateTime sentAt, String error) {
    }
}
