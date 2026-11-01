package com.clinicflow.repo;

import com.clinicflow.domain.Appointment;
import com.clinicflow.domain.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {

    Optional<Appointment> findByIdAndClinicId(Long id, Long clinicId);

    List<Appointment> findByDoctorIdAndStartAtLessThanAndEndAtGreaterThanAndStatusNotOrderByStartAtAsc(
            Long doctorId, LocalDateTime endAt, LocalDateTime startAt, AppointmentStatus status);

    List<Appointment> findByClinicIdAndStartAtBetweenOrderByStartAtAsc(
            Long clinicId, LocalDateTime from, LocalDateTime to);

    List<Appointment> findByClinicIdAndStartAtGreaterThanEqualAndStartAtLessThanOrderByStartAtAsc(
            Long clinicId, LocalDateTime from, LocalDateTime to);

    List<Appointment> findByClinicIdAndPatientIdOrderByStartAtDesc(Long clinicId, Long patientId);

    @Query("""
            select a from Appointment a
            where a.doctor.id = :doctorId
              and a.status <> com.clinicflow.domain.AppointmentStatus.CANCELLED
              and a.startAt < :endAt
              and a.endAt > :startAt
              and (:excludeId is null or a.id <> :excludeId)
            """)
    List<Appointment> findOverlapping(
            @Param("doctorId") Long doctorId,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            @Param("excludeId") Long excludeId);

    @Query("""
            select a from Appointment a
            where a.clinic.id = :clinicId
              and a.startAt >= :from and a.startAt < :to
              and (:doctorId is null or a.doctor.id = :doctorId)
              and (:statuses is null or a.status in :statuses)
            order by a.startAt asc
            """)
    List<Appointment> search(
            @Param("clinicId") Long clinicId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("doctorId") Long doctorId,
            @Param("statuses") Collection<AppointmentStatus> statuses);

    @Query("""
            select a from Appointment a
            where a.clinic.id = :clinicId
              and a.startAt >= :from and a.startAt < :to
              and a.status = com.clinicflow.domain.AppointmentStatus.CANCELLED
            order by a.startAt asc
            """)
    List<Appointment> findCancelledInRange(
            @Param("clinicId") Long clinicId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select count(a) from Appointment a
            where a.clinic.id = :clinicId
              and a.recovered = true
              and a.createdAt >= :from
            """)
    long countRecoveredSince(@Param("clinicId") Long clinicId, @Param("from") LocalDateTime from);

    @Query("""
            select a from Appointment a
            where a.clinic.id = :clinicId
              and a.status in :statuses
              and a.startAt < :before
            """)
    List<Appointment> findByStatusesAndStartBefore(
            @Param("clinicId") Long clinicId,
            @Param("statuses") Collection<AppointmentStatus> statuses,
            @Param("before") LocalDateTime before);

    @Query("""
            select count(a) from Appointment a
            where a.clinic.id = :clinicId
              and a.startAt >= :from and a.startAt < :to
              and a.status = :status
            """)
    long countByRangeAndStatus(
            @Param("clinicId") Long clinicId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            @Param("status") AppointmentStatus status);

    long countByPatientId(Long patientId);

    long countByPatientIdAndStatus(Long patientId, AppointmentStatus status);

    Optional<Appointment> findFirstByPatientIdAndStatusOrderByStartAtDesc(Long patientId, AppointmentStatus status);
}
