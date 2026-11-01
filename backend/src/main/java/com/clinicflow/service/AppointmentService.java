package com.clinicflow.service;

import com.clinicflow.domain.*;
import com.clinicflow.repo.AppointmentEventRepository;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.DoctorRepository;
import com.clinicflow.repo.PatientRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.AppointmentDtos.*;
import com.clinicflow.web.dto.DoctorDtos.SlotView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AppointmentEventRepository eventRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final ClinicRepository clinicRepository;
    private final AvailabilityService availabilityService;
    private final NotificationService notificationService;
    private final AppointmentAssembler assembler;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              AppointmentEventRepository eventRepository,
                              PatientRepository patientRepository,
                              DoctorRepository doctorRepository,
                              ClinicRepository clinicRepository,
                              AvailabilityService availabilityService,
                              NotificationService notificationService,
                              AppointmentAssembler assembler) {
        this.appointmentRepository = appointmentRepository;
        this.eventRepository = eventRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.clinicRepository = clinicRepository;
        this.availabilityService = availabilityService;
        this.notificationService = notificationService;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public List<AppointmentView> search(Long clinicId, LocalDateTime from, LocalDateTime to,
                                        Long doctorId, List<AppointmentStatus> statuses) {
        List<Appointment> appointments = appointmentRepository.search(clinicId, from, to, doctorId, statuses);
        return assembler.toViews(appointments, false);
    }

    @Transactional(readOnly = true)
    public AppointmentView get(Long clinicId, Long id) {
        return assembler.toView(require(clinicId, id), true);
    }

    @Transactional
    public AppointmentView book(AuthPrincipal principal, BookRequest request) {
        Clinic clinic = requireClinic(principal.clinicId());
        Patient patient = patientRepository.findByIdAndClinicId(request.patientId(), clinic.getId())
                .orElseThrow(() -> ApiException.notFound("Patient not found"));
        Doctor doctor = requireDoctor(clinic.getId(), request.doctorId());
        AppointmentOrigin origin = parseOrigin(request.origin());

        Appointment appointment = createAppointment(clinic, patient, doctor,
                normalise(request.startAt()), request.reason(), origin);
        notificationService.scheduleFor(appointment);
        return assembler.toView(appointment, true);
    }

    /**
     * Shared booking path used by the waitlist recovery flow.
     */
    @Transactional
    public Appointment createAppointment(Clinic clinic, Patient patient, Doctor doctor, LocalDateTime startAt,
                                         String reason, AppointmentOrigin origin) {
        SlotView slot = availabilityService.requireBookableSlot(doctor, normalise(startAt));
        Appointment appointment = new Appointment();
        appointment.setClinic(clinic);
        appointment.setPatient(patient);
        appointment.setDoctor(doctor);
        appointment.setStartAt(slot.startAt());
        appointment.setEndAt(slot.endAt());
        appointment.setReason(reason);
        appointment.setOrigin(origin);
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointmentRepository.save(appointment);
        recordEvent(appointment, AppointmentEventType.BOOKED, origin == AppointmentOrigin.WAITLIST ? "Waitlist" : "Reception",
                (origin == AppointmentOrigin.WAITLIST ? "Booked from waitlist for " : "Booked for ") + patient.getName());
        return appointment;
    }

    @Transactional
    public AppointmentView reschedule(AuthPrincipal principal, Long id, RescheduleRequest request) {
        Appointment appointment = require(principal.clinicId(), id);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                || appointment.getStatus() == AppointmentStatus.COMPLETED
                || appointment.getStatus() == AppointmentStatus.NO_SHOW) {
            throw ApiException.conflict("This appointment can no longer be moved.");
        }
        Doctor doctor = request.doctorId() == null || request.doctorId().equals(appointment.getDoctor().getId())
                ? appointment.getDoctor()
                : requireDoctor(principal.clinicId(), request.doctorId());

        LocalDateTime target = normalise(request.startAt());
        if (target.equals(appointment.getStartAt()) && doctor.getId().equals(appointment.getDoctor().getId())) {
            throw ApiException.badRequest("The appointment is already at that time.");
        }
        SlotView slot = availabilityService.requireBookableSlot(doctor, target);

        String previous = appointment.getStartAt().toString();
        appointment.setDoctor(doctor);
        appointment.setStartAt(slot.startAt());
        appointment.setEndAt(slot.endAt());
        appointment.setStatus(AppointmentStatus.SCHEDULED);
        appointment.setConfirmedAt(null);
        appointmentRepository.save(appointment);
        recordEvent(appointment, AppointmentEventType.RESCHEDULED, principal.name(),
                "Moved from " + previous.replace('T', ' ') + " to " + slot.startAt().toString().replace('T', ' '));
        notificationService.scheduleFor(appointment);
        return assembler.toView(appointment, true);
    }

    @Transactional
    public AppointmentView cancel(AuthPrincipal principal, Long id, CancelRequest request) {
        Appointment appointment = require(principal.clinicId(), id);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw ApiException.conflict("This appointment is already cancelled.");
        }
        if (appointment.getStatus() == AppointmentStatus.COMPLETED) {
            throw ApiException.conflict("Completed visits cannot be cancelled.");
        }
        CancellationType type = parseCancellationType(request.cancellationType());
        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointment.setCancellationType(type);
        appointment.setCancelledAt(LocalDateTime.now());
        appointment.setCancelledBy(principal.name());
        appointment.setCancellationReason(request.reason());
        appointmentRepository.save(appointment);
        notificationService.cancelPending(appointment);
        recordEvent(appointment, AppointmentEventType.CANCELLED, principal.name(),
                type.name().replace('_', ' ').toLowerCase(Locale.ENGLISH)
                        + (request.reason() == null || request.reason().isBlank() ? "" : " — " + request.reason()));
        return assembler.toView(appointment, true);
    }

    @Transactional
    public AppointmentView updateStatus(AuthPrincipal principal, Long id, StatusRequest request) {
        Appointment appointment = require(principal.clinicId(), id);
        AppointmentStatus target;
        try {
            target = AppointmentStatus.valueOf(request.status().toUpperCase(Locale.ENGLISH));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown appointment status: " + request.status());
        }
        if (target == AppointmentStatus.CANCELLED) {
            throw ApiException.badRequest("Use the cancel action to cancel an appointment.");
        }
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw ApiException.conflict("Cancelled appointments cannot change status.");
        }
        if ((target == AppointmentStatus.COMPLETED || target == AppointmentStatus.NO_SHOW)
                && appointment.getStartAt().isAfter(LocalDateTime.now())) {
            throw ApiException.badRequest("Attendance can only be recorded once the visit has started.");
        }
        appointment.setStatus(target);
        if (target == AppointmentStatus.CONFIRMED) {
            appointment.setConfirmedAt(LocalDateTime.now());
            recordEvent(appointment, AppointmentEventType.CONFIRMED, principal.name(), request.note());
        } else if (target == AppointmentStatus.COMPLETED) {
            if (appointment.getConfirmedAt() == null) {
                appointment.setConfirmedAt(LocalDateTime.now());
            }
            notificationService.cancelPending(appointment);
            recordEvent(appointment, AppointmentEventType.COMPLETED, principal.name(),
                    request.note() == null ? "Patient attended" : request.note());
        } else if (target == AppointmentStatus.NO_SHOW) {
            notificationService.cancelPending(appointment);
            recordEvent(appointment, AppointmentEventType.NO_SHOW, principal.name(),
                    request.note() == null ? "Patient did not arrive" : request.note());
        } else {
            recordEvent(appointment, AppointmentEventType.BOOKED, principal.name(), "Status set to " + target);
        }
        appointmentRepository.save(appointment);
        return assembler.toView(appointment, true);
    }

    @Transactional
    public AppointmentView confirm(AuthPrincipal principal, Long id) {
        Appointment appointment = require(principal.clinicId(), id);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw ApiException.conflict("Cancelled appointments cannot be confirmed.");
        }
        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointment.setConfirmedAt(LocalDateTime.now());
        appointmentRepository.save(appointment);
        recordEvent(appointment, AppointmentEventType.CONFIRMED, principal.name(), "Patient confirmed");
        return assembler.toView(appointment, true);
    }

    @Transactional
    public AppointmentView sendReminder(AuthPrincipal principal, Long id, ReminderRequest request) {
        Appointment appointment = require(principal.clinicId(), id);
        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw ApiException.conflict("Cancelled appointments have no reminders.");
        }
        NotificationType type;
        try {
            type = request.type() == null ? NotificationType.REMINDER_24H
                    : NotificationType.valueOf(request.type().toUpperCase(Locale.ENGLISH));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Unknown reminder type");
        }
        notificationService.sendNow(appointment, type);
        return assembler.toView(appointment, true);
    }

    @Transactional(readOnly = true)
    public List<AppointmentView> forPatient(Long clinicId, Long patientId) {
        List<Appointment> appointments = appointmentRepository
                .findByClinicIdAndPatientIdOrderByStartAtDesc(clinicId, patientId);
        return assembler.toViews(appointments, false);
    }

    @Transactional(readOnly = true)
    public Appointment require(Long clinicId, Long id) {
        return appointmentRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> ApiException.notFound("Appointment not found"));
    }

    @Transactional(readOnly = true)
    public List<Appointment> inRange(Long clinicId, LocalDateTime from, LocalDateTime to) {
        return appointmentRepository
                .findByClinicIdAndStartAtGreaterThanEqualAndStartAtLessThanOrderByStartAtAsc(clinicId, from, to);
    }

    public void recordEvent(Appointment appointment, AppointmentEventType type, String actor, String note) {
        AppointmentEvent event = new AppointmentEvent();
        event.setAppointment(appointment);
        event.setEventType(type);
        event.setOccurredAt(LocalDateTime.now());
        event.setActor(actor);
        event.setNote(note);
        eventRepository.save(event);
    }

    private Clinic requireClinic(Long clinicId) {
        return clinicRepository.findById(clinicId)
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));
    }

    private Doctor requireDoctor(Long clinicId, Long doctorId) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> ApiException.notFound("Doctor not found"));
        if (!doctor.getClinic().getId().equals(clinicId)) {
            throw ApiException.notFound("Doctor not found");
        }
        if (!doctor.isActive()) {
            throw ApiException.badRequest("That doctor is not currently taking appointments.");
        }
        return doctor;
    }

    private LocalDateTime normalise(LocalDateTime startAt) {
        return startAt.withSecond(0).withNano(0);
    }

    private AppointmentOrigin parseOrigin(String origin) {
        if (origin == null || origin.isBlank()) {
            return AppointmentOrigin.STAFF;
        }
        try {
            return AppointmentOrigin.valueOf(origin.toUpperCase(Locale.ENGLISH));
        } catch (IllegalArgumentException ex) {
            return AppointmentOrigin.STAFF;
        }
    }

    private CancellationType parseCancellationType(String value) {
        try {
            return CancellationType.valueOf(value.toUpperCase(Locale.ENGLISH));
        } catch (IllegalArgumentException ex) {
            throw ApiException.badRequest("Cancellation type must be PATIENT_LATE, PATIENT_ADVANCE or CLINIC");
        }
    }

}
