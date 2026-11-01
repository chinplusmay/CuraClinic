package com.clinicflow.repo;

import com.clinicflow.domain.Notification;
import com.clinicflow.domain.NotificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByAppointmentIdOrderByScheduledAtAsc(Long appointmentId);

    List<Notification> findByAppointmentIdInOrderByScheduledAtAsc(java.util.Collection<Long> appointmentIds);

    List<Notification> findByStatusAndScheduledAtLessThanEqualOrderByScheduledAtAsc(
            NotificationStatus status, LocalDateTime dueAt);

    List<Notification> findByAppointmentIdAndStatus(Long appointmentId, NotificationStatus status);

    @Query("""
            select n from Notification n
            where n.appointment.clinic.id = :clinicId
              and n.scheduledAt >= :from and n.scheduledAt < :to
            """)
    List<Notification> findByClinicAndScheduledRange(
            @Param("clinicId") Long clinicId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    @Query("""
            select n from Notification n
            join n.appointment a
            where a.clinic.id = :clinicId and a.id = :appointmentId
            """)
    List<Notification> findByClinicAndAppointment(
            @Param("clinicId") Long clinicId, @Param("appointmentId") Long appointmentId);

    @Query("""
            select count(n) from Notification n
            where n.appointment.id = :appointmentId and n.status = :status
            """)
    long countByAppointmentAndStatus(
            @Param("appointmentId") Long appointmentId,
            @Param("status") NotificationStatus status);
}
