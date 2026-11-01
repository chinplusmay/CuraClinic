package com.clinicflow.web;

import com.clinicflow.service.AnalyticsService;
import com.clinicflow.web.dto.AnalyticsDtos.PublicSnapshot;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final AnalyticsService analyticsService;

    public PublicController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping("/snapshot")
    public PublicSnapshot snapshot() {
        return analyticsService.publicSnapshot();
    }
}
