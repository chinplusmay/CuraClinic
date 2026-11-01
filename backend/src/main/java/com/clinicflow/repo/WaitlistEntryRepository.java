package com.clinicflow.repo;

import com.clinicflow.domain.WaitlistEntry;
import com.clinicflow.domain.WaitlistStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, Long> {

    List<WaitlistEntry> findByClinicIdOrderByCreatedAtAsc(Long clinicId);

    List<WaitlistEntry> findByClinicIdAndStatusOrderByCreatedAtAsc(Long clinicId, WaitlistStatus status);

    List<WaitlistEntry> findByClinicIdAndStatusInOrderByCreatedAtAsc(
            Long clinicId, Collection<WaitlistStatus> statuses);

    long countByClinicIdAndStatus(Long clinicId, WaitlistStatus status);
}
