package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.history.ChangeLogResponse;
import com.thedigitalsole.campaignmanager.service.ChangeLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
@RequiredArgsConstructor
public class HistoryController {

    private final ChangeLogService changeLogService;

    // GET /api/history?campaignId=1 | distributionId=4 | partnerId=2 (none = latest company-wide), newest first
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<ChangeLogResponse> getHistory(
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) Long distributionId,
            @RequestParam(required = false) Long partnerId
    ) {
        return changeLogService.getHistory(campaignId, distributionId, partnerId);
    }
}
