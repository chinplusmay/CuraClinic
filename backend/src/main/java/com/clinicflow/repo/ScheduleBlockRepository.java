package com.clinicflow.repo;

import com.clinicflow.domain.ScheduleBlock;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ScheduleBlockRepository extends JpaRepository<ScheduleBlock, Long> {

    List<ScheduleBlock> findByDoctorIdAndStartAtLessThanAndEndAtGreaterThanOrderByStartAtAsc(
            Long doctorId, LocalDateTime endAt, LocalDateTime startAt);

    List<ScheduleBlock> findByDoctorIdInAndStartAtLessThanAndEndAtGreaterThanOrderByStartAtAsc(
            List<Long> doctorIds, LocalDateTime endAt, LocalDateTime startAt);

    List<ScheduleBlock> findByDoctorIdOrderByStartAtAsc(Long doctorId);
}
