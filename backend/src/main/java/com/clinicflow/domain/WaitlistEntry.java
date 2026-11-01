package com.clinicflow.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "waitlist_entry")
public class WaitlistEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "clinic_id")
    private Clinic clinic;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    /** Null means "any doctor". */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Column(name = "preferred_from")
    private LocalDate preferredFrom;

    @Column(name = "preferred_to")
    private LocalDate preferredTo;

    @Enumerated(EnumType.STRING)
    @Column(name = "preferred_time_of_day", nullable = false, length = 16)
    private PreferredTimeOfDay preferredTimeOfDay = PreferredTimeOfDay.ANY;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private WaitlistStatus status = WaitlistStatus.WAITING;

    @Column(length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "resolved_appointment_id")
    private Long resolvedAppointmentId;
}
