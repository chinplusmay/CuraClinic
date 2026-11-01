package com.clinicflow.web.dto;

import com.clinicflow.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password) {
    }

    public record ClinicRegistrationRequest(
            @NotBlank @Size(max = 160) String clinicName,
            @Size(max = 40) String clinicPhone,
            @Size(max = 255) String clinicAddress,
            @NotBlank @Size(max = 120) String ownerName,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    public record StaffRegistrationRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Email @Size(max = 190) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotNull Role role) {
    }

    public record TeamMemberView(
            Long userId,
            String name,
            String email,
            String role) {
    }

    public record UserView(
            Long id,
            String name,
            String email,
            String role,
            Long clinicId,
            String clinicName) {
    }

    public record AuthResponse(String token, UserView user) {
    }
}
