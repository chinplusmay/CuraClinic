package com.clinicflow.repo;

import com.clinicflow.domain.ClinicMembership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClinicMembershipRepository extends JpaRepository<ClinicMembership, Long> {

    List<ClinicMembership> findByUserIdOrderByIdAsc(Long userId);

    List<ClinicMembership> findByClinicIdOrderByIdAsc(Long clinicId);

    Optional<ClinicMembership> findByClinicIdAndUserId(Long clinicId, Long userId);

    Optional<ClinicMembership> findFirstByUserIdOrderByIdAsc(Long userId);
}
