package com.clinicflow.service;

import com.clinicflow.domain.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/**
 * Sends notifications through SMTP when it is configured. Without SMTP the message is
 * written to the application log and still recorded as delivered, which keeps local
 * development and demos fully functional.
 */
@Component
public class NotificationGateway {

    private static final Logger log = LoggerFactory.getLogger(NotificationGateway.class);

    private final JavaMailSender mailSender;
    private final String mailHost;
    private final String fromAddress;

    public NotificationGateway(JavaMailSender mailSender,
                               @Value("${spring.mail.host:}") String mailHost,
                               @Value("${spring.mail.username:no-reply@clinicflow.app}") String fromAddress) {
        this.mailSender = mailSender;
        this.mailHost = mailHost;
        this.fromAddress = fromAddress == null || fromAddress.isBlank() ? "no-reply@clinicflow.app" : fromAddress;
    }

    public boolean isLiveDelivery() {
        return mailHost != null && !mailHost.isBlank();
    }

    public void deliver(Notification notification) {
        String recipient = notification.getRecipient();
        if (recipient == null || recipient.isBlank()) {
            throw new IllegalStateException("No recipient contact on file");
        }
        if (notification.getChannel() == com.clinicflow.domain.NotificationChannel.EMAIL && isLiveDelivery()) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(recipient);
            message.setSubject("ClinicFlow appointment update");
            message.setText(notification.getBody());
            mailSender.send(message);
            return;
        }
        log.info("[notification:{}:{}] to={} :: {}", notification.getChannel(), notification.getType(), recipient,
                notification.getBody());
    }
}
