package com.clinicflow.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReminderJob {

    private static final Logger log = LoggerFactory.getLogger(ReminderJob.class);

    private final NotificationService notificationService;

    public ReminderJob(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @Scheduled(fixedDelayString = "${clinicflow.reminders.poll-ms:30000}", initialDelay = 20000)
    public void dispatchReminders() {
        try {
            int sent = notificationService.dispatchDue();
            if (sent > 0) {
                log.info("Dispatched {} appointment notifications", sent);
            }
        } catch (Exception ex) {
            log.error("Reminder dispatch failed", ex);
        }
    }
}
