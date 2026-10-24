package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.distribution.*;
import com.thedigitalsole.campaignmanager.service.DistributionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/distributions")
@RequiredArgsConstructor
public class DistributionController {

    private final DistributionService distributionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public DistributionResponse createDistribution(@Valid @RequestBody CreateDistributionRequest request) {
        return distributionService.createDistribution(request);
    }

    // GET /api/distributions?campaignId=1&publisherId=2 (both optional)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<DistributionResponse> getDistributions(
            @RequestParam(required = false) Long campaignId,
            @RequestParam(required = false) Long publisherId
    ) {
        return distributionService.getDistributions(campaignId, publisherId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public DistributionResponse getDistributionById(@PathVariable Long id) {
        return distributionService.getDistributionById(id);
    }

    // Full update: send every field, empty ones are cleared
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public DistributionResponse updateDistribution(
            @PathVariable Long id,
            @Valid @RequestBody DistributionRequest request
    ) {
        return distributionService.updateDistribution(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public void deleteDistribution(@PathVariable Long id) {
        distributionService.deleteDistribution(id);
    }

    // =========================
    // MONTHLY ENTRIES
    // =========================

    @GetMapping("/{id}/months")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<MonthEntryResponse> getMonths(@PathVariable Long id) {
        return distributionService.getMonths(id);
    }

    // PUT /api/distributions/5/months/2026-10 creates or overwrites October 2026
    @PutMapping("/{id}/months/{month}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public MonthEntryResponse saveMonth(
            @PathVariable Long id,
            @PathVariable YearMonth month,
            @Valid @RequestBody MonthEntryRequest request
    ) {
        return distributionService.saveMonth(id, month, request);
    }

    @DeleteMapping("/{id}/months/{month}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public void deleteMonth(@PathVariable Long id, @PathVariable YearMonth month) {
        distributionService.deleteMonth(id, month);
    }
}
