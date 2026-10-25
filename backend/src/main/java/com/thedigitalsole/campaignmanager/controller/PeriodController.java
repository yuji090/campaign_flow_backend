package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.period.*;
import com.thedigitalsole.campaignmanager.service.PeriodService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/** Month close (locks a month's numbers) and monthly exchange rates. */
@RestController
@RequestMapping("/api/periods")
@RequiredArgsConstructor
public class PeriodController {

    private final PeriodService periodService;

    @GetMapping("/settings")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public Map<String, String> getSettings() {
        return Map.of("baseCurrency", periodService.getBaseCurrency());
    }

    // =========================
    // MONTH CLOSE
    // =========================

    @GetMapping("/closed")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<MonthCloseResponse> getClosedMonths() {
        return periodService.getClosedMonths();
    }

    // PUT /api/periods/2026-10/close
    @PutMapping("/{month}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public MonthCloseResponse closeMonth(
            @PathVariable YearMonth month,
            @Valid @RequestBody(required = false) MonthCloseRequest request
    ) {
        return periodService.closeMonth(month, request);
    }

    @DeleteMapping("/{month}/close")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void reopenMonth(@PathVariable YearMonth month) {
        periodService.reopenMonth(month);
    }

    // =========================
    // EXCHANGE RATES
    // =========================

    @GetMapping("/rates")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<ExchangeRateResponse> getRates(
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
    ) {
        return periodService.getRates(from, to);
    }

    // PUT /api/periods/2026-10/rates/EUR  { "rate": 1.08 }
    @PutMapping("/{month}/rates/{currency}")
    @PreAuthorize("hasRole('ADMIN')")
    public ExchangeRateResponse saveRate(
            @PathVariable YearMonth month,
            @PathVariable String currency,
            @Valid @RequestBody ExchangeRateRequest request
    ) {
        return periodService.saveRate(month, currency, request);
    }

    @DeleteMapping("/{month}/rates/{currency}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteRate(@PathVariable YearMonth month, @PathVariable String currency) {
        periodService.deleteRate(month, currency);
    }
}
