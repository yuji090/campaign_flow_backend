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

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DistributionService {

    private final DistributionRepository distributionRepository;
    private final DistributionMonthRepository monthRepository;
    private final CampaignRepository campaignRepository;
    private final UserRepository userRepository;
    private final PartnerService partnerService;

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

        applyRequest(distribution, request);

        return toResponse(distributionRepository.save(distribution));
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

        return monthRepository.findByDistributionIdOrderByMonthAsc(distributionId)
                .stream()
                .map(this::toMonthResponse)
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

        Distribution distribution = distributionRepository.getOrThrow(distributionId);
        LocalDate monthStart = month.atDay(1);

        DistributionMonth entry = monthRepository
                .findByDistributionIdAndMonth(distributionId, monthStart)
                .orElseGet(() -> {
                    DistributionMonth created = new DistributionMonth();
                    created.setDistribution(distribution);
                    created.setMonth(monthStart);
                    return created;
                });

        if (entry.getId() != null) {
            entry.checkVersion(request.getVersion(), month + " for this distribution");
        }

        entry.setTotalEvents(request.getTotalEvents());
        entry.setPayableEvents(request.getPayableEvents());
        entry.setPayout(request.getPayout());
        entry.setNotes(blankToNull(request.getNotes()));

        return toMonthResponse(monthRepository.save(entry));
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

    private MonthEntryResponse toMonthResponse(DistributionMonth entry) {

        MonthEntryResponse response = new MonthEntryResponse();

        response.setId(entry.getId());
        response.setDistributionId(entry.getDistribution().getId());
        response.setMonth(YearMonth.from(entry.getMonth()));
        response.setTotalEvents(entry.getTotalEvents());
        response.setPayableEvents(entry.getPayableEvents());
        response.setScrubbedEvents(entry.getTotalEvents() - entry.getPayableEvents());
        response.setPayout(entry.getPayout());
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
