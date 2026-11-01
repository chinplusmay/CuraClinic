package com.clinicflow.web.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public final class AnalyticsDtos {

    private AnalyticsDtos() {
    }

    public record Totals(
            int booked,
            int completed,
            int noShow,
            int cancelled,
            int recovered,
            int eligibleForNoShow,
            int reminderSent,
            int reminderAttempted) {
    }

    public record Rates(
            double noShowRate,
            double cancellationRate,
            double attendanceRate,
            double slotRecoveryRate,
            double utilization,
            double reminderDeliveryRate,
            double confirmationRate) {
    }

    public record CancellationBreakdown(int patientLate, int patientAdvance, int clinic, int noShow) {
    }

    public record ReminderStats(
            int total,
            int sent,
            int failed,
            int pending,
            Map<String, Integer> byType) {
    }

    public record TrendPoint(
            LocalDate date,
            int booked,
            int completed,
            int noShow,
            int cancelled,
            int recovered) {
    }

    public record DoctorPerformance(
            Long doctorId,
            String name,
            String specialty,
            int booked,
            int completed,
            int noShow,
            int cancelled,
            double noShowRate,
            double utilization) {
    }

    public record SourceBreakdown(String origin, int count) {
    }

    public record PublicSnapshot(
            String clinicName,
            int days,
            double noShowRate,
            double slotRecoveryRate,
            double reminderDeliveryRate,
            double utilization,
            int recoveredSlots,
            int appointments) {
    }

    public record AnalyticsView(
            LocalDate from,
            LocalDate to,
            int days,
            Totals totals,
            Rates rates,
            CancellationBreakdown cancellations,
            ReminderStats reminders,
            List<TrendPoint> trend,
            List<DoctorPerformance> byDoctor,
            List<SourceBreakdown> bySource) {
    }
}
