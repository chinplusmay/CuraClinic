package com.clinicflow.seed;

import com.clinicflow.domain.*;
import com.clinicflow.repo.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Creates a realistic demo clinic the first time the application starts against an empty
 * database. Disable with SEED_DEMO_DATA=false.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final ClinicRepository clinicRepository;
    private final AppUserRepository userRepository;
    private final ClinicMembershipRepository membershipRepository;
    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final ScheduleBlockRepository blockRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final AppointmentEventRepository eventRepository;
    private final NotificationRepository notificationRepository;
    private final WaitlistEntryRepository waitlistRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;

    private final Random random = new Random(20261030L);

    public DemoDataSeeder(ClinicRepository clinicRepository,
                          AppUserRepository userRepository,
                          ClinicMembershipRepository membershipRepository,
                          DoctorRepository doctorRepository,
                          DoctorScheduleRepository scheduleRepository,
                          ScheduleBlockRepository blockRepository,
                          PatientRepository patientRepository,
                          AppointmentRepository appointmentRepository,
                          AppointmentEventRepository eventRepository,
                          NotificationRepository notificationRepository,
                          WaitlistEntryRepository waitlistRepository,
                          PasswordEncoder passwordEncoder,
                          @Value("${clinicflow.seed-demo-data:true}") boolean enabled) {
        this.clinicRepository = clinicRepository;
        this.userRepository = userRepository;
        this.membershipRepository = membershipRepository;
        this.doctorRepository = doctorRepository;
        this.scheduleRepository = scheduleRepository;
        this.blockRepository = blockRepository;
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.eventRepository = eventRepository;
        this.notificationRepository = notificationRepository;
        this.waitlistRepository = waitlistRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!enabled) {
            return;
        }
        if (clinicRepository.count() > 0) {
            Clinic clinic = clinicRepository.findAll().get(0);
            seedStaff(clinic);
            return;
        }
        log.info("Seeding ClinicFlow demo clinic…");

        Clinic clinic = new Clinic();
        clinic.setName("Northbridge Family Clinic");
        clinic.setTimezone("Asia/Kolkata");
        clinic.setAddress("2nd Floor, 14 Linden Road, Bengaluru 560001");
        clinic.setPhone("+91 80 4123 8890");
        clinic.setSlotMinutes(20);
        clinicRepository.save(clinic);

        seedStaff(clinic);
        List<Doctor> doctors = seedDoctors(clinic);
        seedBlock(doctors.get(1));
        List<Patient> patients =        seedPatients(clinic);
        seedAppointments(clinic, doctors, patients);
        seedUpcomingCancellations(clinic);
        seedWaitlist(clinic, doctors, patients);

        log.info("Demo clinic seeded with {} appointments", appointmentRepository.count());
    }

    private void seedStaff(Clinic clinic) {
        createMember(clinic, "Priya Menon", "owner@northbridgeclinic.com", Role.OWNER);
        createMember(clinic, "Rhea Kapoor", "reception@northbridgeclinic.com", Role.RECEPTIONIST);
        createMember(clinic, "Dr. Ananya Rao", "doctor@northbridgeclinic.com", Role.DOCTOR);
    }

    private void createMember(Clinic clinic, String name, String email, Role role) {
        AppUser user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            user = new AppUser();
            user.setFullName(name);
            user.setEmail(email);
            user.setPasswordHash(passwordEncoder.encode("clinicflow123"));
            user = userRepository.save(user);
        } else {
            user.setPasswordHash(passwordEncoder.encode("clinicflow123"));
            user = userRepository.save(user);
        }

        if (membershipRepository.findByClinicIdAndUserId(clinic.getId(), user.getId()).isEmpty()) {
            ClinicMembership membership = new ClinicMembership();
            membership.setClinic(clinic);
            membership.setUser(user);
            membership.setRole(role);
            membershipRepository.save(membership);
        }
    }

    private List<Doctor> seedDoctors(Clinic clinic) {
        List<Doctor> doctors = new ArrayList<>();
        doctors.add(createDoctor(clinic, "Ananya Rao", "General Medicine"));
        doctors.add(createDoctor(clinic, "Vikram Shah", "Paediatrics"));
        doctors.add(createDoctor(clinic, "Meera Iyer", "Dermatology"));

        for (int day = 1; day <= 6; day++) {
            addSchedule(doctors.get(0), day, LocalTime.of(9, 0), LocalTime.of(13, 0));
            addSchedule(doctors.get(0), day, LocalTime.of(17, 0), LocalTime.of(20, 0));
            addSchedule(doctors.get(1), day, LocalTime.of(10, 0), LocalTime.of(13, 0));
            addSchedule(doctors.get(1), day, LocalTime.of(16, 0), LocalTime.of(19, 0));
            if (day >= 2) {
                addSchedule(doctors.get(2), day, LocalTime.of(11, 0), LocalTime.of(14, 0));
                addSchedule(doctors.get(2), day, LocalTime.of(17, 0), LocalTime.of(19, 30));
            }
        }
        return doctors;
    }

    private Doctor createDoctor(Clinic clinic, String name, String specialty) {
        Doctor doctor = new Doctor();
        doctor.setClinic(clinic);
        doctor.setName(name);
        doctor.setSpecialty(specialty);
        doctor.setActive(true);
        return doctorRepository.save(doctor);
    }

    private void addSchedule(Doctor doctor, int day, LocalTime start, LocalTime end) {
        DoctorSchedule schedule = new DoctorSchedule();
        schedule.setDoctor(doctor);
        schedule.setDayOfWeek(day);
        schedule.setStartTime(start);
        schedule.setEndTime(end);
        schedule.setSlotMinutes(20);
        schedule.setActive(true);
        scheduleRepository.save(schedule);
    }

    private void seedBlock(Doctor doctor) {
        ScheduleBlock block = new ScheduleBlock();
        block.setDoctor(doctor);
        block.setStartAt(LocalDate.now().plusDays(2).atTime(10, 0));
        block.setEndAt(LocalDate.now().plusDays(2).atTime(13, 0));
        block.setReason("CME conference");
        blockRepository.save(block);
    }

    private List<Patient> seedPatients(Clinic clinic) {
        String[] names = {
                "Aarav Sharma", "Diya Patel", "Rohan Mehta", "Ishita Nair", "Kabir Reddy",
                "Saanvi Joshi", "Advait Kulkarni", "Myra Desai", "Vivaan Gupta", "Anika Rao",
                "Arjun Menon", "Neha Bhat", "Karan Malhotra", "Tara Krishnan", "Dev Chawla",
                "Riya Sethi", "Nikhil Varma", "Pooja Shetty", "Sanjay Pillai", "Meghna Bose",
                "Yash Agarwal", "Aditi Rane", "Siddharth Iyer", "Kavya Menon", "Rahul Sinha",
                "Sneha Kulkarni", "Aryan Dutta", "Lakshmi Narayan", "Manav Kapoor", "Zara Khan",
                "Ira Saxena", "Ved Chavan", "Naina Roy", "Omkar Jadhav", "Sara Fernandes",
                "Tanvi Mishra", "Ayush Chauhan", "Reet Ahuja", "Pranav Kamath", "Mira Thomas"
        };
        List<Patient> patients = new ArrayList<>();
        for (int i = 0; i < names.length; i++) {
            Patient patient = new Patient();
            patient.setClinic(clinic);
            patient.setName(names[i]);
            patient.setPhone(String.format("+91 98%08d", 10000000 + i * 137));
            if (i % 4 != 3) {
                patient.setEmail(names[i].toLowerCase().replace(' ', '.') + "@example.com");
            }
            if (i % 11 == 0) {
                patient.setNotes("Prefers morning appointments. Mild hypertension, on regular review.");
            } else if (i % 7 == 0) {
                patient.setNotes("Requires a 20 minute consult slot.");
            }
            patients.add(patientRepository.save(patient));
        }
        return patients;
    }

    private void seedAppointments(Clinic clinic, List<Doctor> doctors, List<Patient> patients) {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        for (LocalDate date = today.minusDays(45); !date.isAfter(today.plusDays(12)); date = date.plusDays(1)) {
            if (date.getDayOfWeek() == DayOfWeek.SUNDAY) {
                continue;
            }
            boolean past = date.isBefore(today);
            boolean future = date.isAfter(today);
            double occupancy = past ? 0.55 : future ? 0.28 : 0.6;
            for (Doctor doctor : doctors) {
                List<LocalTime> slots = slotsFor(doctor, date);
                for (LocalTime slot : slots) {
                    if (random.nextDouble() > occupancy) {
                        continue;
                    }
                    LocalDateTime startAt = date.atTime(slot);
                    if (startAt.isBefore(now.minusMinutes(30))) {
                        createHistoricalAppointment(clinic, doctor, patients, startAt, past);
                    } else {
                        createUpcomingAppointment(clinic, doctor, patients, startAt);
                    }
                }
            }
        }
    }

    private List<LocalTime> slotsFor(Doctor doctor, LocalDate date) {
        int day = date.getDayOfWeek().getValue();
        List<LocalTime> slots = new ArrayList<>();
        for (DoctorSchedule schedule : scheduleRepository.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctor.getId())) {
            if (!schedule.isActive() || schedule.getDayOfWeek() != day) {
                continue;
            }
            LocalTime cursor = schedule.getStartTime();
            while (!cursor.plusMinutes(schedule.getSlotMinutes()).isAfter(schedule.getEndTime())) {
                slots.add(cursor);
                cursor = cursor.plusMinutes(schedule.getSlotMinutes());
            }
        }
        return slots;
    }

    private void createHistoricalAppointment(Clinic clinic, Doctor doctor, List<Patient> patients,
                                             LocalDateTime startAt, boolean pastDate) {
        Patient patient = randomPatient(patients);
        Appointment appointment = newAppointment(clinic, doctor, patient, startAt, 20);
        double roll = random.nextDouble();
        LocalDateTime createdAt = startAt.minusDays(2 + random.nextInt(5)).minusHours(random.nextInt(8));
        appointment.setCreatedAt(createdAt);
        if (roll < 0.12) {
            appointment.setStatus(AppointmentStatus.NO_SHOW);
            appointment.setConfirmedAt(random.nextDouble() < 0.5 ? startAt.minusDays(1) : null);
        } else if (roll < 0.24) {
            appointment.setStatus(AppointmentStatus.CANCELLED);
            double typeRoll = random.nextDouble();
            CancellationType type = typeRoll < 0.45 ? CancellationType.PATIENT_LATE
                    : typeRoll < 0.85 ? CancellationType.PATIENT_ADVANCE
                    : CancellationType.CLINIC;
            appointment.setCancellationType(type);
            appointment.setCancelledAt(type == CancellationType.PATIENT_LATE
                    ? startAt.minusHours(1 + random.nextInt(20))
                    : startAt.minusHours(26 + random.nextInt(40)));
            appointment.setCancelledBy(type == CancellationType.CLINIC ? "Priya Menon" : "Rhea Kapoor");
            appointment.setCancellationReason(switch (type) {
                case PATIENT_LATE -> "Patient called to cancel on the day";
                case PATIENT_ADVANCE -> "Patient rescheduling travel";
                case CLINIC -> "Doctor called away for an emergency";
            });
        } else {
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointment.setConfirmedAt(startAt.minusDays(1).withHour(18));
        }
        if (random.nextDouble() < 0.35) {
            appointment.setOrigin(AppointmentOrigin.PHONE);
        } else if (random.nextDouble() < 0.18) {
            appointment.setOrigin(AppointmentOrigin.ONLINE);
        } else {
            appointment.setOrigin(AppointmentOrigin.STAFF);
        }
        appointmentRepository.save(appointment);
        recordEvent(appointment, AppointmentEventType.BOOKED, createdAt, "Rhea Kapoor", "Booked via phone");
        seedNotifications(appointment, createdAt);

        if (appointment.getStatus() == AppointmentStatus.CANCELLED
                && appointment.getCancellationType() != CancellationType.CLINIC
                && random.nextDouble() < 0.4) {
            recoverSlot(clinic, doctor, patients, appointment, true);
        }
    }

    /**
     * Leaves a handful of genuinely open slots in the coming days so the reception team has
     * cancellations to recover on the dashboard and in the waitlist queue.
     */
    private void seedUpcomingCancellations(Clinic clinic) {
        LocalDate today = LocalDate.now();
        List<Appointment> upcoming = appointmentRepository
                .findByClinicIdAndStartAtGreaterThanEqualAndStartAtLessThanOrderByStartAtAsc(
                        clinic.getId(), today.atStartOfDay(), today.plusDays(4).atStartOfDay()).stream()
                .filter(a -> a.getStatus() == AppointmentStatus.SCHEDULED
                        || a.getStatus() == AppointmentStatus.CONFIRMED)
                .filter(a -> a.getStartAt().isAfter(LocalDateTime.now().plusHours(3)))
                .toList();
        CancellationType[] types = {CancellationType.PATIENT_LATE, CancellationType.PATIENT_ADVANCE,
                CancellationType.PATIENT_ADVANCE, CancellationType.CLINIC, CancellationType.PATIENT_LATE,
                CancellationType.PATIENT_ADVANCE};
        int cancelled = 0;
        java.util.Set<String> usedDays = new java.util.HashSet<>();
        for (Appointment appointment : upcoming) {
            if (cancelled >= types.length) {
                break;
            }
            String key = appointment.getStartAt().toLocalDate() + ":" + appointment.getDoctor().getId();
            if (!usedDays.add(key)) {
                continue;
            }
            CancellationType type = types[cancelled];
            appointment.setStatus(AppointmentStatus.CANCELLED);
            appointment.setCancellationType(type);
            appointment.setCancelledAt(LocalDateTime.now().minusHours(1 + cancelled));
            appointment.setCancelledBy(type == CancellationType.CLINIC ? "Priya Menon" : "Rhea Kapoor");
            appointment.setCancellationReason(switch (type) {
                case PATIENT_LATE -> "Patient woke up unwell";
                case PATIENT_ADVANCE -> "Patient has a work conflict";
                case CLINIC -> "Doctor unavailable, clinic cancelled the slot";
            });
            appointmentRepository.save(appointment);
            recordEvent(appointment, AppointmentEventType.CANCELLED, appointment.getCancelledAt(),
                    appointment.getCancelledBy(), "Late cancellation — slot released");
            for (Notification notification : notificationRepository
                    .findByAppointmentIdAndStatus(appointment.getId(), NotificationStatus.PENDING)) {
                notification.setStatus(NotificationStatus.CANCELLED);
                notificationRepository.save(notification);
            }
            cancelled++;
        }
        log.info("Seeded {} upcoming cancellations for the recovery queue", cancelled);
    }

    private void createUpcomingAppointment(Clinic clinic, Doctor doctor, List<Patient> patients,
                                           LocalDateTime startAt) {
        Patient patient = randomPatient(patients);
        Appointment appointment = newAppointment(clinic, doctor, patient, startAt, 20);
        boolean confirmed = random.nextDouble() < 0.45;
        appointment.setStatus(confirmed ? AppointmentStatus.CONFIRMED : AppointmentStatus.SCHEDULED);
        appointment.setConfirmedAt(confirmed ? LocalDateTime.now().minusHours(2 + random.nextInt(30)) : null);
        appointment.setOrigin(random.nextDouble() < 0.5 ? AppointmentOrigin.PHONE : AppointmentOrigin.STAFF);
        LocalDateTime createdAt = LocalDateTime.now().minusDays(1 + random.nextInt(6));
        appointment.setCreatedAt(createdAt);
        appointmentRepository.save(appointment);
        recordEvent(appointment, AppointmentEventType.BOOKED, createdAt, "Rhea Kapoor", "Booked via phone");
        if (confirmed) {
            recordEvent(appointment, AppointmentEventType.CONFIRMED, appointment.getConfirmedAt(), patient.getName(),
                    "Confirmed by phone");
        }
        seedNotifications(appointment, createdAt);
    }

    private void recoverSlot(Clinic clinic, Doctor doctor, List<Patient> patients, Appointment cancelled,
                             boolean pastDate) {
        Patient replacement = randomPatient(patients);
        if (replacement.getId().equals(cancelled.getPatient().getId())) {
            replacement = patients.get((patients.indexOf(replacement) + 1) % patients.size());
        }
        Appointment recovered = newAppointment(clinic, doctor, replacement, cancelled.getStartAt(), 20);
        recovered.setOrigin(AppointmentOrigin.WAITLIST);
        recovered.setRecovered(true);
        recovered.setRecoveredFromAppointmentId(cancelled.getId());
        recovered.setCreatedAt(cancelled.getCancelledAt() != null
                ? cancelled.getCancelledAt().plusMinutes(20)
                : cancelled.getStartAt().minusDays(1));
        recovered.setStatus(pastDate ? AppointmentStatus.COMPLETED : AppointmentStatus.CONFIRMED);
        recovered.setConfirmedAt(recovered.getCreatedAt().plusMinutes(5));
        appointmentRepository.save(recovered);
        recordEvent(recovered, AppointmentEventType.WAITLIST_OFFERED, recovered.getCreatedAt(), "Rhea Kapoor",
                "Filled a cancelled slot from the waitlist");
        seedNotifications(recovered, recovered.getCreatedAt());
    }

    private Appointment newAppointment(Clinic clinic, Doctor doctor, Patient patient, LocalDateTime startAt,
                                       int minutes) {
        Appointment appointment = new Appointment();
        appointment.setClinic(clinic);
        appointment.setDoctor(doctor);
        appointment.setPatient(patient);
        appointment.setStartAt(startAt);
        appointment.setEndAt(startAt.plusMinutes(minutes));
        appointment.setReason(random.nextDouble() < 0.3 ? "Follow-up review" : "Consultation");
        return appointment;
    }

    private Patient randomPatient(List<Patient> patients) {
        return patients.get(random.nextInt(patients.size()));
    }

    private void recordEvent(Appointment appointment, AppointmentEventType type, LocalDateTime at,
                             String actor, String note) {
        AppointmentEvent event = new AppointmentEvent();
        event.setAppointment(appointment);
        event.setEventType(type);
        event.setOccurredAt(at);
        event.setActor(actor);
        event.setNote(note);
        eventRepository.save(event);
    }

    private void seedNotifications(Appointment appointment, LocalDateTime createdAt) {
        NotificationChannel channel = appointment.getPatient().getEmail() != null
                ? NotificationChannel.EMAIL : NotificationChannel.SMS;
        String recipient = channel == NotificationChannel.EMAIL
                ? appointment.getPatient().getEmail() : appointment.getPatient().getPhone();
        LocalDateTime now = LocalDateTime.now();
        createNotification(appointment, NotificationType.CONFIRMATION, channel, recipient,
                createdAt.plusMinutes(1), now);
        if (createdAt.isBefore(appointment.getStartAt().minusHours(24))) {
            createNotification(appointment, NotificationType.REMINDER_24H, channel, recipient,
                    appointment.getStartAt().minusHours(24), now);
        }
        if (createdAt.isBefore(appointment.getStartAt().minusHours(2))) {
            createNotification(appointment, NotificationType.REMINDER_2H, channel, recipient,
                    appointment.getStartAt().minusHours(2), now);
        }
    }

    private void createNotification(Appointment appointment, NotificationType type, NotificationChannel channel,
                                    String recipient, LocalDateTime scheduledAt, LocalDateTime now) {
        Notification notification = new Notification();
        notification.setAppointment(appointment);
        notification.setType(type);
        notification.setChannel(channel);
        notification.setRecipient(recipient);
        notification.setScheduledAt(scheduledAt);
        notification.setBody("ClinicFlow " + type.name().toLowerCase().replace('_', ' ')
                + " for " + appointment.getPatient().getName() + " with Dr. " + appointment.getDoctor().getName());
        if (appointment.getCancelledAt() != null && scheduledAt.isAfter(appointment.getCancelledAt())) {
            notification.setStatus(NotificationStatus.CANCELLED);
        } else if (scheduledAt.isAfter(now)) {
            notification.setStatus(NotificationStatus.PENDING);
        } else if (random.nextDouble() < 0.06) {
            notification.setStatus(NotificationStatus.FAILED);
            notification.setError("Recipient mailbox unavailable");
        } else {
            notification.setStatus(NotificationStatus.SENT);
            notification.setSentAt(scheduledAt.plusMinutes(1));
        }
        notificationRepository.save(notification);
    }

    private void seedWaitlist(Clinic clinic, List<Doctor> doctors, List<Patient> patients) {
        int[] indexes = {4, 9, 12, 18, 23, 27, 31, 35};
        String[] notes = {
                "Wants an earlier review, flexible after 5 pm.",
                "Works nearby, can come in on short notice.",
                "Follow-up due this month, any doctor is fine.",
                "Would like a Saturday morning slot.",
                "Prefers evening appointments.",
                "Happy to come in at short notice.",
                "Needs a slot before the end of next week.",
                "Can fill a cancelled slot any weekday morning."
        };
        PreferredTimeOfDay[] times = {
                PreferredTimeOfDay.EVENING, PreferredTimeOfDay.ANY, PreferredTimeOfDay.ANY,
                PreferredTimeOfDay.MORNING, PreferredTimeOfDay.EVENING, PreferredTimeOfDay.ANY,
                PreferredTimeOfDay.AFTERNOON, PreferredTimeOfDay.MORNING
        };
        for (int i = 0; i < indexes.length; i++) {
            WaitlistEntry entry = new WaitlistEntry();
            entry.setClinic(clinic);
            entry.setPatient(patients.get(indexes[i]));
            entry.setDoctor(i % 3 == 0 ? doctors.get(i % doctors.size()) : null);
            entry.setPreferredFrom(LocalDate.now());
            entry.setPreferredTo(LocalDate.now().plusDays(10));
            entry.setPreferredTimeOfDay(times[i]);
            entry.setNotes(notes[i]);
            entry.setStatus(WaitlistStatus.WAITING);
            waitlistRepository.save(entry);
        }
    }
}
