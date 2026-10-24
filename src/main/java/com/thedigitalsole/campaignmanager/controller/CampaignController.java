package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.campaign.CampaignMonthRequest;
import com.thedigitalsole.campaignmanager.dto.campaign.CampaignMonthResponse;
import com.thedigitalsole.campaignmanager.dto.campaign.CampaignRequest;
import com.thedigitalsole.campaignmanager.dto.campaign.CampaignResponse;
import com.thedigitalsole.campaignmanager.dto.campaign.CreateGeoRequest;
import com.thedigitalsole.campaignmanager.dto.campaign.CreateVerticalRequest;
import com.thedigitalsole.campaignmanager.dto.finance.CampaignSummaryResponse;
import com.thedigitalsole.campaignmanager.model.campaign.Geo;
import com.thedigitalsole.campaignmanager.model.campaign.Vertical;
import com.thedigitalsole.campaignmanager.service.CampaignService;
import com.thedigitalsole.campaignmanager.service.FinanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
public class CampaignController {

    private final CampaignService campaignService;
    private final FinanceService financeService;

    @PostMapping("/geos")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public Geo createGeo(@Valid @RequestBody CreateGeoRequest request) {
        return campaignService.createGeo(request);
    }

    @GetMapping("/geos")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<Geo> getAllGeos() {
        return campaignService.getAllGeos();
    }

    @PostMapping("/verticals")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public Vertical createVertical(@Valid @RequestBody CreateVerticalRequest request) {
        return campaignService.createVertical(request);
    }

    @GetMapping("/verticals")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<Vertical> getAllVerticals() {
        return campaignService.getAllVerticals();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CampaignResponse createCampaign(@Valid @RequestBody CampaignRequest request) {
        return campaignService.createCampaign(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<CampaignResponse> getAllCampaigns() {
        return campaignService.getAllCampaigns();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CampaignResponse getCampaignById(@PathVariable Long id) {
        return campaignService.getCampaignById(id);
    }

    // Full update: send every field, empty ones are cleared
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CampaignResponse updateCampaign(
            @PathVariable Long id,
            @Valid @RequestBody CampaignRequest request
    ) {
        return campaignService.updateCampaign(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public void deleteCampaign(@PathVariable Long id) {
        campaignService.deleteCampaign(id);
    }

    // =========================
    // MONTHLY REVENUE
    // =========================

    @GetMapping("/{id}/months")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<CampaignMonthResponse> getMonths(@PathVariable Long id) {
        return campaignService.getMonths(id);
    }

    // PUT /api/campaigns/5/months/2026-10 creates or overwrites October 2026
    @PutMapping("/{id}/months/{month}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CampaignMonthResponse saveMonth(
            @PathVariable Long id,
            @PathVariable YearMonth month,
            @Valid @RequestBody CampaignMonthRequest request
    ) {
        return campaignService.saveMonth(id, month, request);
    }

    @DeleteMapping("/{id}/months/{month}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public void deleteMonth(@PathVariable Long id, @PathVariable YearMonth month) {
        campaignService.deleteMonth(id, month);
    }

    // GET /api/campaigns/5/summary?from=2026-01&to=2026-12 (both optional, default all time)
    @GetMapping("/{id}/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public CampaignSummaryResponse getSummary(
            @PathVariable Long id,
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
    ) {
        return financeService.getCampaignSummary(id, from, to);
    }
}
