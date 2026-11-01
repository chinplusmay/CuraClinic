package com.clinicflow.security;

import com.clinicflow.domain.Role;

public record AuthPrincipal(
        Long userId,
        String email,
        String name,
        Long clinicId,
        String clinicName,
        Role role) {

    public boolean isStaff() {
        return role == Role.OWNER || role == Role.RECEPTIONIST;
    }
}
