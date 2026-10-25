package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.distribution.*;
import com.thedigitalsole.campaignmanager.exception.ConflictException;
import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.distribution.Distribution;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionMonth;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.repository.CampaignRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionMonthRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionRepository;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import static com.thedigitalsole.campaignmanager.service.ChangeLogService.Diff;
import static com.thedigitalsole.campaignmanager.service.ChangeLogService.entry;
import static com.thedigitalsole.campaignmanager.service.ChangeLogService.monthLabel;

@Service
@RequiredArgsConstructor
public class DistributionService {

    private final DistributionRepository distributionRepository;
    private final DistributionMonthRepository monthRepository;
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final PartnerService partnerService;
    private final PeriodService periodService;
    private final ChangeLogService changeLogService;

    // =========================
    // CREATE
    // =========================

    @Transactional
    public DistributionResponse createDistribution(CreateDistributionRequest request) {

        Campaign campaign = campaignRepository.getOrThrow(request.getCampaignId());

        Distribution distribution = new Distribution();

        distribution.setCampaign(campaign);
        distribution.setCurrency(campaign.getCurrency());

        applyRequest(distribution, request);

        return toResponse(distributionRepository.save(distribution));
    }

    // =========================
    // READ
    // =========================

    // Filter by campaign, publisher, both, or neither
    @Transactional(readOnly = true)
    public List<DistributionResponse> getDistributions(Long campaignId, Long publisherId) {

        List<Distribution> distributions;

        if (campaignId != null && publisherId != null) {
            distributions = distributionRepository.findByCampaignIdAndPublisherId(campaignId, publisherId);
        } else if (campaignId != null) {
            distributions = distributionRepository.findByCampaignId(campaignId);
        } else if (publisherId != null) {
            distributions = distributionRepository.findByPublisherId(publisherId);
        } else {
            distributions = distributionRepository.findAll();
        }

        return distributions.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DistributionResponse getDistributionById(Long id) {
        return toResponse(distributionRepository.getOrThrow(id));
    }

    // =========================
    // FULL UPDATE
    // =========================

    @Transactional
    public DistributionResponse updateDistribution(Long id, DistributionRequest request) {

        Distribution distribution = distributionRepository.getOrThrow(id);
        distribution.checkVersion(request.getVersion(), "This distribution");

        // Moving entered months to another publisher would rewrite who we owe money to
        boolean publisherChanged = !distribution.getPublisher().getId().equals(request.getPublisherId());

        if (publisherChanged && monthRepository.existsByDistributionId(id)) {
            throw new ConflictException(
                    "This distribution already has monthly data, so its publisher cannot be changed. "
                            + "Create a new distribution for the other publisher instead"
            );
        }

        BigDecimal rateBefore = distribution.getPayout();

        applyRequest(distribution, request);

        Distribution saved = distributionRepository.save(distribution);

        changeLogService.record(entry("DISTRIBUTION", saved.getId(), "UPDATE")
                .campaign(saved.getCampaign().getId())
                .distribution(saved.getId())
                .partner(saved.getPublisher().getId())
                .summary(new Diff().change("rate", rateBefore, saved.getPayout()).join(publisherLabel(saved) + " ")));

        return toResponse(saved);
    }

    // =========================
    // DELETE
    // =========================

    @Transactional
    public void deleteDistribution(Long id) {

        Distribution distribution = distributionRepository.getOrThrow(id);

        // Protect finance history: a distribution with monthly data is closed, not deleted
        if (monthRepository.existsByDistributionId(id)) {
            throw new ConflictException(
                    "Distribution has monthly data. Set its status to "
                            + DistributionStatus.COMPLETED + " instead of deleting it"
            );
        }

        distributionRepository.delete(distribution);
    }

    // =========================
    // MONTHLY ENTRIES
    // =========================

    @Transactional(readOnly = true)
    public List<MonthEntryResponse> getMonths(Long distributionId) {

        distributionRepository.getOrThrow(distributionId);

        Set<YearMonth> closed = periodService.getClosedMonthSet();

        return monthRepository.findByDistributionIdOrderByMonthAsc(distributionId)
                .stream()
                .map(m -> toMonthResponse(m, closed.contains(YearMonth.from(m.getMonth()))))
                .toList();
    }

    // Creates the month if it does not exist yet, otherwise overwrites it
    @Transactional
    public MonthEntryResponse saveMonth(
            Long distributionId,
            YearMonth month,
            MonthEntryRequest request
    ) {

        if (request.getPayableEvents() > request.getTotalEvents()) {
            throw new IllegalArgumentException("Payable events cannot be more than total events");
        }

        if (request.getApprovedEvents() != null && request.getApprovedEvents() > request.getTotalEvents()) {
            throw new IllegalArgumentException("Advertiser-approved events cannot be more than total events");
        }

        BigDecimal adjustment = request.getAdjustment() != null ? request.getAdjustment() : BigDecimal.ZERO;
        String adjustmentNote = blankToNull(request.getAdjustmentNote());

        if (adjustment.signum() != 0 && adjustmentNote == null) {
            throw new IllegalArgumentException("Add a reason for the adjustment, e.g. \"Sep fraud deduction\"");
        }

        if (request.getPayout().add(adjustment).signum() < 0) {
            throw new IllegalArgumentException("Payout plus adjustment cannot be below zero");
        }

        Distribution distribution = distributionRepository.getOrThrow(distributionId);
        periodService.assertEditable(month);

        LocalDate monthStart = month.atDay(1);

        DistributionMonth entry = monthRepository
                .findByDistributionIdAndMonth(distributionId, monthStart)
                .orElseGet(() -> {
                    DistributionMonth created = new DistributionMonth();
                    created.setDistribution(distribution);
                    created.setMonth(monthStart);
                    return created;
                });

        boolean isNew = entry.getId() == null;

        if (!isNew) {
            entry.checkVersion(request.getVersion(), month + " for this distribution");
        }

        Diff diff = isNew
                ? new Diff()
                        .value("total events", request.getTotalEvents())
                        .value("payable", request.getPayableEvents())
                        .value("approved", request.getApprovedEvents())
                        .value("payout", request.getPayout())
                        .value("adjustment", adjustment)
                : new Diff()
                        .change("total events", entry.getTotalEvents(), request.getTotalEvents())
                        .change("payable", entry.getPayableEvents(), request.getPayableEvents())
                        .change("approved", entry.getApprovedEvents(), request.getApprovedEvents())
                        .change("payout", entry.getPayout(), request.getPayout())
                        .change("adjustment", entry.getAdjustment(), adjustment);

        entry.setTotalEvents(request.getTotalEvents());
        entry.setPayableEvents(request.getPayableEvents());
        entry.setApprovedEvents(request.getApprovedEvents());
        entry.setPayout(request.getPayout());
        entry.setAdjustment(adjustment);
        entry.setAdjustmentNote(adjustment.signum() != 0 ? adjustmentNote : null);
        entry.setNotes(blankToNull(request.getNotes()));

        DistributionMonth saved = monthRepository.save(entry);

        changeLogService.record(entry("DISTRIBUTION_MONTH", saved.getId(), isNew ? "CREATE" : "UPDATE")
                .campaign(distribution.getCampaign().getId())
                .distribution(distributionId)
                .partner(distribution.getPublisher().getId())
                .month(monthStart)
                .summary(CampaignService.withNote(
                        diff.join(publisherLabel(distribution) + " · " + monthLabel(month) + " " + (isNew ? "added" : "edited") + ": "),
                        saved.getAdjustmentNote())));

        return toMonthResponse(saved, false);
    }

    @Transactional
    public void deleteMonth(Long distributionId, YearMonth month) {

        DistributionMonth entry = monthRepository
                .findByDistributionIdAndMonth(distributionId, month.atDay(1))
                .orElseThrow(() ->
                        new NotFoundException(
                                "No entry for " + month + " on distribution " + distributionId
                        )
                );

        periodService.assertOpen(month);

        Distribution distribution = entry.getDistribution();

        changeLogService.record(entry("DISTRIBUTION_MONTH", entry.getId(), "DELETE")
                .campaign(distribution.getCampaign().getId())
                .distribution(distributionId)
                .partner(distribution.getPublisher().getId())
                .month(entry.getMonth())
                .summary(new Diff()
                        .value("payable", entry.getPayableEvents())
                        .value("payout", entry.getPayout())
                        .value("adjustment", entry.getAdjustment())
                        .join(publisherLabel(distribution) + " · " + monthLabel(month) + " deleted: ")));

        monthRepository.delete(entry);
    }

    // =========================
    // HELPERS
    // =========================

    private void applyRequest(Distribution distribution, DistributionRequest request) {

        Partner publisher = findPublisher(request.getPublisherId());
        Partner advertiser = distribution.getCampaign().getAdvertiser();

        if (advertiser != null && Objects.equals(advertiser.getId(), publisher.getId())) {
            throw new IllegalArgumentException(
                    "This campaign came from " + publisher.getCompanyName()
                            + ", so it cannot be distributed back to them"
            );
        }

        distribution.setPublisher(publisher);
        distribution.setLabel(blankToNull(request.getLabel()));
        distribution.setManager(request.getManagerId() != null ? userRepository.getOrThrow(request.getManagerId()) : null);
        distribution.setPayout(request.getPayout());

        if (request.getStatus() != null) {
            distribution.setStatus(request.getStatus());
        }

        distribution.setStartDate(request.getStartDate());
        distribution.setEndDate(request.getEndDate());
        distribution.setNotes(blankToNull(request.getNotes()));

        validateDateRange(distribution.getStartDate(), distribution.getEndDate());
    }

    private Partner findPublisher(Long partnerId) {

        Partner partner = partnerService.findPartnerById(partnerId);

        if (!partner.isPublisher()) {
            throw new IllegalArgumentException(
                    "Partner " + partner.getCompanyName() + " is not marked as a publisher"
            );
        }

        return partner;
    }

    private DistributionResponse toResponse(Distribution distribution) {

        DistributionResponse response = new DistributionResponse();

        response.setId(distribution.getId());
        response.setCampaignId(distribution.getCampaign().getId());
        response.setCampaignName(distribution.getCampaign().getName());
        response.setPublisherId(distribution.getPublisher().getId());
        response.setPublisherName(distribution.getPublisher().getCompanyName());
        response.setLabel(distribution.getLabel());

        if (distribution.getManager() != null) {
            response.setManagerId(distribution.getManager().getId());
            response.setManagerName(distribution.getManager().getName());
        }

        response.setPayout(distribution.getPayout());
        response.setCurrency(distribution.getCurrency());
        response.setStatus(distribution.getStatus());
        response.setStartDate(distribution.getStartDate());
        response.setEndDate(distribution.getEndDate());
        response.setNotes(distribution.getNotes());
        response.setCreatedAt(distribution.getCreatedAt());
        response.setUpdatedAt(distribution.getUpdatedAt());
        response.setUpdatedByName(distribution.getUpdatedBy() != null ? distribution.getUpdatedBy().getName() : null);
        response.setVersion(distribution.getVersion());

        return response;
    }

    // "Adsterra" or "Adsterra (BR)"
    private String publisherLabel(Distribution distribution) {
        String name = distribution.getPublisher().getCompanyName();
        return distribution.getLabel() != null ? name + " (" + distribution.getLabel() + ")" : name;
    }

    MonthEntryResponse toMonthResponse(DistributionMonth entry, boolean closed) {

        MonthEntryResponse response = new MonthEntryResponse();

        response.setId(entry.getId());
        response.setDistributionId(entry.getDistribution().getId());
        response.setMonth(YearMonth.from(entry.getMonth()));
        response.setTotalEvents(entry.getTotalEvents());
        response.setPayableEvents(entry.getPayableEvents());
        response.setScrubbedEvents(entry.getTotalEvents() - entry.getPayableEvents());
        response.setApprovedEvents(entry.getApprovedEvents());
        response.setPayout(entry.getPayout());
        response.setAdjustment(entry.getAdjustment());
        response.setAdjustmentNote(entry.getAdjustmentNote());
        response.setNetPayout(entry.netPayout());
        response.setClosed(closed);

        BigDecimal rate = entry.getDistribution().getPayout();

        if (rate != null && rate.signum() > 0) {
            BigDecimal expected = rate.multiply(BigDecimal.valueOf(entry.getPayableEvents())).setScale(2, RoundingMode.HALF_UP);
            BigDecimal tolerance = expected.abs().multiply(new BigDecimal("0.01")).max(new BigDecimal("0.01"));

            response.setExpectedPayout(expected);
            response.setPayoutMismatch(entry.getPayout().subtract(expected).abs().compareTo(tolerance) > 0);
        }

        response.setCurrency(entry.getDistribution().getCurrency());
        response.setNotes(entry.getNotes());
        response.setUpdatedByName(entry.getUpdatedBy() != null ? entry.getUpdatedBy().getName() : null);
        response.setUpdatedAt(entry.getUpdatedAt());
        response.setVersion(entry.getVersion());

        return response;
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {

        if (startDate != null
                && endDate != null
                && endDate.isBefore(startDate)) {

            throw new IllegalArgumentException(
                    "End date cannot be before start date"
            );
        }
    }

    private String blankToNull(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
