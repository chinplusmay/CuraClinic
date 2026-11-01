package com.clinicflow.service;

import com.clinicflow.domain.Clinic;
import com.clinicflow.domain.Doctor;
import com.clinicflow.domain.DoctorSchedule;
import com.clinicflow.domain.ScheduleBlock;
import com.clinicflow.repo.ClinicRepository;
import com.clinicflow.repo.DoctorRepository;
import com.clinicflow.repo.DoctorScheduleRepository;
import com.clinicflow.repo.ScheduleBlockRepository;
import com.clinicflow.security.AuthPrincipal;
import com.clinicflow.web.ApiException;
import com.clinicflow.web.dto.DoctorDtos.BlockRequest;
import com.clinicflow.web.dto.DoctorDtos.BlockView;
import com.clinicflow.web.dto.DoctorDtos.DoctorRequest;
import com.clinicflow.web.dto.DoctorDtos.DoctorView;
import com.clinicflow.web.dto.DoctorDtos.ScheduleInput;
import com.clinicflow.web.dto.DoctorDtos.ScheduleView;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final DoctorScheduleRepository scheduleRepository;
    private final ScheduleBlockRepository blockRepository;
    private final ClinicRepository clinicRepository;

    public DoctorService(DoctorRepository doctorRepository,
                         DoctorScheduleRepository scheduleRepository,
                         ScheduleBlockRepository blockRepository,
                         ClinicRepository clinicRepository) {
        this.doctorRepository = doctorRepository;
        this.scheduleRepository = scheduleRepository;
        this.blockRepository = blockRepository;
        this.clinicRepository = clinicRepository;
    }

    @Transactional(readOnly = true)
    public List<DoctorView> list(Long clinicId) {
        return doctorRepository.findByClinicIdOrderByNameAsc(clinicId).stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public DoctorView get(Long clinicId, Long id) {
        return toView(require(clinicId, id));
    }

    @Transactional
    public DoctorView create(AuthPrincipal principal, DoctorRequest request) {
        Clinic clinic = clinicRepository.findById(principal.clinicId())
                .orElseThrow(() -> ApiException.notFound("Clinic not found"));
        Doctor doctor = new Doctor();
        doctor.setClinic(clinic);
        doctor.setName(request.name().trim());
        doctor.setSpecialty(request.specialty().trim());
        doctor.setActive(request.active() == null || request.active());
        doctorRepository.save(doctor);
        return toView(doctor);
    }

    @Transactional
    public DoctorView update(AuthPrincipal principal, Long id, DoctorRequest request) {
        Doctor doctor = require(principal.clinicId(), id);
        doctor.setName(request.name().trim());
        doctor.setSpecialty(request.specialty().trim());
        if (request.active() != null) {
            doctor.setActive(request.active());
        }
        doctorRepository.save(doctor);
        return toView(doctor);
    }

    @Transactional
    public DoctorView replaceSchedules(AuthPrincipal principal, Long id, List<ScheduleInput> inputs) {
        Doctor doctor = require(principal.clinicId(), id);
        for (ScheduleInput input : inputs) {
            if (!input.endTime().isAfter(input.startTime())) {
                throw ApiException.badRequest("End time must be after start time for day " + input.dayOfWeek());
            }
        }
        scheduleRepository.deleteByDoctorId(doctor.getId());
        scheduleRepository.flush();
        for (ScheduleInput input : inputs) {
            DoctorSchedule schedule = new DoctorSchedule();
            schedule.setDoctor(doctor);
            schedule.setDayOfWeek(input.dayOfWeek());
            schedule.setStartTime(input.startTime());
            schedule.setEndTime(input.endTime());
            schedule.setSlotMinutes(input.slotMinutes());
            schedule.setActive(input.active() == null || input.active());
            scheduleRepository.save(schedule);
        }
        return toView(doctor);
    }

    @Transactional
    public DoctorView addBlock(AuthPrincipal principal, Long id, BlockRequest request) {
        Doctor doctor = require(principal.clinicId(), id);
        if (!request.endAt().isAfter(request.startAt())) {
            throw ApiException.badRequest("The block must end after it starts.");
        }
        ScheduleBlock block = new ScheduleBlock();
        block.setDoctor(doctor);
        block.setStartAt(request.startAt());
        block.setEndAt(request.endAt());
        block.setReason(request.reason());
        blockRepository.save(block);
        return toView(doctor);
    }

    @Transactional
    public DoctorView removeBlock(AuthPrincipal principal, Long id, Long blockId) {
        Doctor doctor = require(principal.clinicId(), id);
        ScheduleBlock block = blockRepository.findById(blockId)
                .filter(b -> b.getDoctor().getId().equals(doctor.getId()))
                .orElseThrow(() -> ApiException.notFound("Block not found"));
        blockRepository.delete(block);
        return toView(doctor);
    }

    @Transactional(readOnly = true)
    public Doctor require(Long clinicId, Long id) {
        Doctor doctor = doctorRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Doctor not found"));
        if (!doctor.getClinic().getId().equals(clinicId)) {
            throw ApiException.notFound("Doctor not found");
        }
        return doctor;
    }

    private DoctorView toView(Doctor doctor) {
        List<ScheduleView> schedules = scheduleRepository
                .findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctor.getId()).stream()
                .map(s -> new ScheduleView(s.getId(), s.getDayOfWeek(), s.getStartTime(), s.getEndTime(),
                        s.getSlotMinutes(), s.isActive()))
                .toList();
        List<BlockView> blocks = blockRepository.findByDoctorIdOrderByStartAtAsc(doctor.getId()).stream()
                .map(b -> new BlockView(b.getId(), b.getStartAt(), b.getEndAt(), b.getReason()))
                .toList();
        return new DoctorView(doctor.getId(), doctor.getName(), doctor.getSpecialty(), doctor.isActive(),
                schedules, blocks);
    }
}
