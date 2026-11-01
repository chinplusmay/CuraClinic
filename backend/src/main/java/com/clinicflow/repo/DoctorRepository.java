package com.clinicflow.repo;

import com.clinicflow.domain.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {

    List<Doctor> findByClinicIdOrderByNameAsc(Long clinicId);

    List<Doctor> findByClinicIdAndActiveTrueOrderByNameAsc(Long clinicId);

    long countByClinicIdAndActiveTrue(Long clinicId);
}
