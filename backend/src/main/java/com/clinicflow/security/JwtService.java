package com.clinicflow.security;

import com.clinicflow.domain.ClinicMembership;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long ttlMinutes;

    public JwtService(@Value("${clinicflow.jwt.secret}") String secret,
                      @Value("${clinicflow.jwt.ttl-minutes:720}") long ttlMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.ttlMinutes = ttlMinutes;
    }

    public String issue(ClinicMembership membership) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(membership.getUser().getEmail())
                .claim("uid", membership.getUser().getId())
                .claim("name", membership.getUser().getFullName())
                .claim("role", membership.getRole().name())
                .claim("clinicId", membership.getClinic().getId())
                .claim("clinicName", membership.getClinic().getName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttlMinutes, ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    public AuthPrincipal parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new AuthPrincipal(
                claims.get("uid", Number.class).longValue(),
                claims.getSubject(),
                claims.get("name", String.class),
                claims.get("clinicId", Number.class).longValue(),
                claims.get("clinicName", String.class),
                com.clinicflow.domain.Role.valueOf(claims.get("role", String.class)));
    }
}
