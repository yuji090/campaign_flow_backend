package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.finance.CompanySummaryResponse;
import com.thedigitalsole.campaignmanager.dto.finance.MonthEntriesResponse;
import com.thedigitalsole.campaignmanager.service.FinanceService;
import com.thedigitalsole.campaignmanager.service.MonthEntriesService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;
    private final MonthEntriesService monthEntriesService;

    // GET /api/finance/summary?from=2026-01&to=2026-12 (both optional, default all time)
    // Use from=to for one month's campaign-wise breakdown
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CompanySummaryResponse getCompanySummary(
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
    ) {
        return financeService.getCompanySummary(from, to);
    }

    // GET /api/finance/entries/2026-10: every campaign and distribution to fill in for October, with saved values
    @GetMapping("/entries/{month}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public MonthEntriesResponse getMonthEntries(@PathVariable YearMonth month) {
        return monthEntriesService.getEntries(month);
    }
}
