package com.clinicflow.repo;

import com.clinicflow.domain.AppointmentEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface AppointmentEventRepository extends JpaRepository<AppointmentEvent, Long> {

    List<AppointmentEvent> findByAppointmentIdOrderByOccurredAtAscIdAsc(Long appointmentId);

    List<AppointmentEvent> findByAppointmentIdInOrderByOccurredAtAscIdAsc(Collection<Long> appointmentIds);
}
