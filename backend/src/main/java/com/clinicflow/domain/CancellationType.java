package com.clinicflow.domain;

/**
 * Why an appointment was cancelled. The distinction matters because the clinic can
 * only recover slots it lost to patients, not the ones it cancelled itself.
 */
public enum CancellationType {
    PATIENT_LATE,
    PATIENT_ADVANCE,
    CLINIC
}
