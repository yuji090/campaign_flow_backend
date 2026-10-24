package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.finance.PartnerSummaryResponse;
import com.thedigitalsole.campaignmanager.dto.partner.CreatePartnerRequest;
import com.thedigitalsole.campaignmanager.dto.partner.PartnerResponse;
import com.thedigitalsole.campaignmanager.dto.partner.UpdatePartnerRequest;
import com.thedigitalsole.campaignmanager.model.partner.PartnerRole;
import com.thedigitalsole.campaignmanager.service.FinanceService;
import com.thedigitalsole.campaignmanager.service.PartnerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/partners")
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;
    private final FinanceService financeService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PartnerResponse createPartner(@Valid @RequestBody CreatePartnerRequest request) {
        return partnerService.createPartner(request);
    }

    // GET /api/partners?role=ADVERTISER|PUBLISHER&employeeId=3 (both optional)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<PartnerResponse> getPartners(
            @RequestParam(required = false) PartnerRole role,
            @RequestParam(required = false) Long employeeId
    ) {
        return partnerService.getPartners(role, employeeId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PartnerResponse getPartnerById(@PathVariable Long id) {
        return partnerService.getPartnerById(id);
    }

    // GET /api/partners/3/summary?from=2026-01&to=2026-12 (both optional, default all time)
    // Use from=to for one month's campaign-wise breakdown
    @GetMapping("/{id}/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PartnerSummaryResponse getPartnerSummary(
            @PathVariable Long id,
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
    ) {
        return financeService.getPartnerSummary(id, from, to);
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PartnerResponse updatePartner(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePartnerRequest request
    ) {
        return partnerService.updatePartner(id, request);
    }

    // Soft delete: keeps the partner's history, just marks it inactive
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deactivatePartner(@PathVariable Long id) {
        partnerService.deactivatePartner(id);
    }
}
