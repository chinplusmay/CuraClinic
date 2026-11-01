package com.clinicflow.repo;

import com.clinicflow.domain.DoctorSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorScheduleRepository extends JpaRepository<DoctorSchedule, Long> {

    List<DoctorSchedule> findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(Long doctorId);

    List<DoctorSchedule> findByDoctorIdInAndActiveTrue(List<Long> doctorIds);

    void deleteByDoctorId(Long doctorId);
}
