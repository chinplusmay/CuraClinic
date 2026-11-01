package com.clinicflow.service;

import com.clinicflow.domain.AppointmentStatus;
import com.clinicflow.domain.Clinic;
import com.clinicflow.domain.Patient;
import com.clinicflow.repo.AppointmentRepository;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.PatientRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.PatientDtos.PatientDetail;
import com.clinicflow.web.dto.PatientDtos.PatientRequest;
import com.clinicflow.web.dto.PatientDtos.PatientView;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PatientService {

    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final ClinicRepository clinicRepository;
    private final AppointmentService appointmentService;
    private final AppointmentAssembler assembler;

    public PatientService(PatientRepository patientRepository,
                          AppointmentRepository appointmentRepository,
                          ClinicRepository clinicRepository,
                          AppointmentService appointmentService,
                          AppointmentAssembler assembler) {
        this.patientRepository = patientRepository;
        this.appointmentRepository = appointmentRepository;
        this.clinicRepository = clinicRepository;
        this.appointmentService = appointmentService;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public List<PatientView> search(Long clinicId, String query) {
        List<Patient> patients = (query == null || query.isBlank())
                ? patientRepository.findByClinicIdOrderByNameAsc(clinicId)
                : patientRepository.search(clinicId, query.trim(), PageRequest.of(0, 60));
        return patients.stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public PatientDetail detail(Long clinicId, Long id) {
        Patient patient = require(clinicId, id);
        return new PatientDetail(toView(patient),
                appointmentService.forPatient(clinicId, patient.getId()));
    }

    @Transactional
    public PatientView create(AuthPrincipal principal, PatientRequest request) {
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));
        Patient patient = new Patient();
        patient.setClinic(clinic);
        apply(patient, request);
        patientRepository.save(patient);
        return toView(patient);
    }

    @Transactional
    public PatientView update(AuthPrincipal principal, Long id, PatientRequest request) {
        Patient patient = require(principal.clinicId(), id);
        apply(patient, request);
        patientRepository.save(patient);
        return toView(patient);
    }

    private void apply(Patient patient, PatientRequest request) {
        patient.setName(request.name().trim());
        patient.setPhone(request.phone().trim());
        patient.setEmail(request.email() == null || request.email().isBlank() ? null : request.email().trim());
        patient.setNotes(request.notes());
    }

    @Transactional(readOnly = true)
    public Patient require(Long clinicId, Long id) {
        return patientRepository.findByIdAndClinicId(id, clinicId)
                .orElseThrow(() -> ApiException.notFound("Patient not found"));
    }

    private PatientView toView(Patient patient) {
        java.time.LocalDateTime lastVisitAt = appointmentRepository
                .findFirstByPatientIdAndStatusOrderByStartAtDesc(patient.getId(), AppointmentStatus.COMPLETED)
                .map(com.clinicflow.domain.Appointment::getStartAt)
                .orElse(null);
        return new PatientView(
                patient.getId(),
                patient.getName(),
                patient.getPhone(),
                patient.getEmail(),
                patient.getNotes(),
                patient.getCreatedAt(),
                lastVisitAt,
                appointmentRepository.countByPatientId(patient.getId()),
                appointmentRepository.countByPatientIdAndStatus(patient.getId(), AppointmentStatus.NO_SHOW));
    }
}
