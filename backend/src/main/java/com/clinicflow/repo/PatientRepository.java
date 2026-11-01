package com.clinicflow.repo;

import com.clinicflow.domain.Patient;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PatientRepository extends JpaRepository<Patient, Long> {

    Optional<Patient> findByIdAndClinicId(Long id, Long clinicId);

    List<Patient> findByClinicIdOrderByNameAsc(Long clinicId);

    @Query("""
            select p from Patient p
            where p.clinic.id = :clinicId
              and (lower(p.name) like lower(concat('%', :q, '%'))
                   or p.phone like concat('%', :q, '%')
                   or lower(coalesce(p.email, '')) like lower(concat('%', :q, '%')))
            order by p.name asc
            """)
    List<Patient> search(@Param("clinicId") Long clinicId, @Param("q") String q, Pageable pageable);

    long countByClinicId(Long clinicId);
}
