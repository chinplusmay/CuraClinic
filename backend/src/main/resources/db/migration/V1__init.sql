-- ClinicFlow initial schema
-- All appointment times are stored as clinic-local wall-clock DATETIME values.

CREATE TABLE clinic (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    address VARCHAR(255) NULL,
    phone VARCHAR(40) NULL,
    slot_minutes INT NOT NULL DEFAULT 20,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

CREATE TABLE app_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_app_user_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE clinic_membership (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    role VARCHAR(24) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_membership_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (id),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES app_user (id),
    CONSTRAINT uk_membership UNIQUE (clinic_id, user_id)
) ENGINE = InnoDB;

CREATE TABLE doctor (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    specialty VARCHAR(120) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_doctor_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (id)
) ENGINE = InnoDB;

CREATE TABLE doctor_schedule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    day_of_week INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_minutes INT NOT NULL DEFAULT 20,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_schedule_doctor FOREIGN KEY (doctor_id) REFERENCES doctor (id) ON DELETE CASCADE,
    CONSTRAINT uk_schedule_slot UNIQUE (doctor_id, day_of_week, start_time)
) ENGINE = InnoDB;

CREATE TABLE schedule_block (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    doctor_id BIGINT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    reason VARCHAR(160) NULL,
    CONSTRAINT fk_block_doctor FOREIGN KEY (doctor_id) REFERENCES doctor (id) ON DELETE CASCADE,
    INDEX idx_block_doctor_time (doctor_id, start_at, end_at)
) ENGINE = InnoDB;

CREATE TABLE patient (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    email VARCHAR(190) NULL,
    notes VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_patient_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (id),
    INDEX idx_patient_clinic_name (clinic_id, name)
) ENGINE = InnoDB;

CREATE TABLE appointment (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NOT NULL,
    start_at DATETIME NOT NULL,
    end_at DATETIME NOT NULL,
    status VARCHAR(24) NOT NULL,
    origin VARCHAR(24) NOT NULL DEFAULT 'STAFF',
    reason VARCHAR(255) NULL,
    confirmed_at DATETIME NULL,
    cancellation_type VARCHAR(24) NULL,
    cancelled_at DATETIME NULL,
    cancelled_by VARCHAR(120) NULL,
    cancellation_reason VARCHAR(255) NULL,
    recovered BOOLEAN NOT NULL DEFAULT FALSE,
    recovered_from_appointment_id BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_appointment_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (id),
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patient (id),
    CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id) REFERENCES doctor (id),
    INDEX idx_appointment_clinic_start (clinic_id, start_at),
    INDEX idx_appointment_doctor_start (doctor_id, start_at),
    INDEX idx_appointment_patient (patient_id)
) ENGINE = InnoDB;

CREATE TABLE appointment_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    event_type VARCHAR(32) NOT NULL,
    occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(120) NULL,
    note VARCHAR(500) NULL,
    CONSTRAINT fk_event_appointment FOREIGN KEY (appointment_id) REFERENCES appointment (id) ON DELETE CASCADE,
    INDEX idx_event_appointment (appointment_id, occurred_at)
) ENGINE = InnoDB;

CREATE TABLE waitlist_entry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT NOT NULL,
    doctor_id BIGINT NULL,
    preferred_from DATE NULL,
    preferred_to DATE NULL,
    preferred_time_of_day VARCHAR(16) NOT NULL DEFAULT 'ANY',
    status VARCHAR(24) NOT NULL DEFAULT 'WAITING',
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_appointment_id BIGINT NULL,
    CONSTRAINT fk_waitlist_clinic FOREIGN KEY (clinic_id) REFERENCES clinic (id),
    CONSTRAINT fk_waitlist_patient FOREIGN KEY (patient_id) REFERENCES patient (id),
    CONSTRAINT fk_waitlist_doctor FOREIGN KEY (doctor_id) REFERENCES doctor (id),
    INDEX idx_waitlist_clinic_status (clinic_id, status)
) ENGINE = InnoDB;

CREATE TABLE notification (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    appointment_id BIGINT NOT NULL,
    channel VARCHAR(16) NOT NULL,
    type VARCHAR(24) NOT NULL,
    recipient VARCHAR(190) NULL,
    scheduled_at DATETIME NOT NULL,
    sent_at DATETIME NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    body VARCHAR(1000) NULL,
    error VARCHAR(255) NULL,
    CONSTRAINT fk_notification_appointment FOREIGN KEY (appointment_id) REFERENCES appointment (id) ON DELETE CASCADE,
    INDEX idx_notification_due (status, scheduled_at),
    INDEX idx_notification_appointment (appointment_id)
) ENGINE = InnoDB;
