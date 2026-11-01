package com.clinicflow.web.dto;

import java.time.LocalDate;
import java.util.List;

public final class DashboardDtos {

    private DashboardDtos() {
    }

    public record Kpis(
            int todayTotal,
            int confirmed,
            int unconfirmed,
            int completed,
            int noShow,
            int cancelled,
            int openSlotsToday,
            int bookedMinutesToday,
            int availableMinutesToday,
            long waitlistWaiting,
            long recoveredThisMonth) {
    }

    public record AttentionItem(
            String type,
            String message,
            AppointmentDtos.AppointmentView appointment) {
    }

    public record DashboardView(
            LocalDate date,
            String clinicName,
            String timezone,
            Kpis kpis,
            List<AppointmentDtos.AppointmentView> agenda,
            List<AttentionItem> attention,
            List<WaitlistDtos.OpenSlotView> recoveryQueue) {
    }
}
