package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.campaign.*;
import com.thedigitalsole.campaignmanager.exception.ConflictException;
import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignMonth;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.repository.CampaignMonthRepository;
import com.thedigitalsole.campaignmanager.repository.CampaignRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionRepository;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final CampaignRepository campaignRepository;
    private final CampaignMonthRepository campaignMonthRepository;
    private final DistributionRepository distributionRepository;
    private final UserRepository userRepository;
    private final PartnerService partnerService;

    // =========================
    // CREATE CAMPAIGN
    // =========================

    @Transactional
    public CampaignResponse createCampaign(CampaignRequest request) {

        Campaign campaign = new Campaign();

        campaign.setCurrency(normalizeCurrency(request.getCurrency()));
        applyRequest(campaign, request);

        return toCampaignResponse(campaignRepository.save(campaign));
    }

    // =========================
    // GET CAMPAIGNS
    // =========================

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllCampaigns() {

        return campaignRepository.findAll()
                .stream()
                .map(this::toCampaignResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignResponse getCampaignById(Long id) {
        return toCampaignResponse(campaignRepository.getOrThrow(id));
    }

    // =========================
    // FULL UPDATE
    // =========================

    @Transactional
    public CampaignResponse updateCampaign(Long id, CampaignRequest request) {

        Campaign campaign = campaignRepository.getOrThrow(id);
        campaign.checkVersion(request.getVersion(), "This campaign");

        String currency = normalizeCurrency(request.getCurrency());

        // All money in a campaign shares one currency, so it is fixed once money or distributions exist
        if (!currency.equals(campaign.getCurrency())) {

            if (campaignMonthRepository.existsByCampaignId(id) || distributionRepository.existsByCampaignId(id)) {
                throw new ConflictException(
                        "Currency cannot be changed after the campaign has distributions or monthly revenue"
                );
            }

            campaign.setCurrency(currency);
        }

        applyRequest(campaign, request);

        return toCampaignResponse(campaignRepository.save(campaign));
    }

    // =========================
    // DELETE
    // =========================

    @Transactional
    public void deleteCampaign(Long id) {

        Campaign campaign = campaignRepository.getOrThrow(id);

        // Protect finance history: a campaign with money or distributions is archived, not deleted
        if (distributionRepository.existsByCampaignId(id) || campaignMonthRepository.existsByCampaignId(id)) {
            throw new ConflictException(
                    "Campaign has distributions or monthly revenue. Set its status to "
                            + CampaignStatus.ARCHIVED + " instead of deleting it"
            );
        }

        campaignRepository.delete(campaign);
    }

    // =========================
    // MONTHLY REVENUE
    // =========================

    @Transactional(readOnly = true)
    public List<CampaignMonthResponse> getMonths(Long campaignId) {

        campaignRepository.getOrThrow(campaignId);

        return campaignMonthRepository.findByCampaignIdOrderByMonthAsc(campaignId)
                .stream()
                .map(this::toMonthResponse)
                .toList();
    }

    // Creates the month if it does not exist yet, otherwise overwrites it
    @Transactional
    public CampaignMonthResponse saveMonth(Long campaignId, YearMonth month, CampaignMonthRequest request) {

        Campaign campaign = campaignRepository.getOrThrow(campaignId);
        LocalDate monthStart = month.atDay(1);

        CampaignMonth entry = campaignMonthRepository
                .findByCampaignIdAndMonth(campaignId, monthStart)
                .orElseGet(() -> {
                    CampaignMonth created = new CampaignMonth();
                    created.setCampaign(campaign);
                    created.setMonth(monthStart);
                    return created;
                });

        if (entry.getId() != null) {
            entry.checkVersion(request.getVersion(), month + " revenue");
        }

        entry.setEvents(request.getEvents() != null ? request.getEvents() : 0);
        entry.setRevenue(request.getRevenue());
        entry.setNotes(blankToNull(request.getNotes()));

        return toMonthResponse(campaignMonthRepository.save(entry));
    }

    @Transactional
    public void deleteMonth(Long campaignId, YearMonth month) {

        CampaignMonth entry = campaignMonthRepository
                .findByCampaignIdAndMonth(campaignId, month.atDay(1))
                .orElseThrow(() ->
                        new NotFoundException(
                                "No revenue entry for " + month + " on campaign " + campaignId
                        )
                );

        campaignMonthRepository.delete(entry);
    }

    // =========================
    // HELPERS
    // =========================

    // Sets every field from the request; empty fields are cleared
    private void applyRequest(Campaign campaign, CampaignRequest request) {

        campaign.setName(request.getName().trim());
        campaign.setPricingModel(request.getPricingModel());
        campaign.setDirect(request.isDirect());
        campaign.setAdvertiser(request.getAdvertiserId() != null ? findAdvertiser(request.getAdvertiserId()) : null);
        campaign.setPayout(request.getPayout());
        campaign.setStatus(request.getStatus());
        campaign.setManager(request.getManagerId() != null ? userRepository.getOrThrow(request.getManagerId()) : null);
        campaign.setStartDate(request.getStartDate());
        campaign.setEndDate(request.getEndDate());
        campaign.setNotes(blankToNull(request.getNotes()));

        if (!campaign.isDirect() && campaign.getAdvertiser() == null) {
            throw new IllegalArgumentException(
                    "Advertiser is required when the campaign is not direct"
            );
        }

        validateDateRange(campaign.getStartDate(), campaign.getEndDate());
    }

    private Partner findAdvertiser(Long partnerId) {

        Partner partner = partnerService.findPartnerById(partnerId);

        if (!partner.isAdvertiser()) {
            throw new IllegalArgumentException(
                    "Partner " + partner.getCompanyName() + " is not marked as an advertiser"
            );
        }

        return partner;
    }

    private CampaignResponse toCampaignResponse(Campaign campaign) {

        CampaignResponse response = new CampaignResponse();

        response.setId(campaign.getId());
        response.setName(campaign.getName());
        response.setPricingModel(campaign.getPricingModel());
        response.setDirect(campaign.isDirect());

        if (campaign.getAdvertiser() != null) {
            response.setAdvertiserId(campaign.getAdvertiser().getId());
            response.setAdvertiserName(campaign.getAdvertiser().getCompanyName());
        }

        response.setPayout(campaign.getPayout());
        response.setCurrency(campaign.getCurrency());
        response.setStatus(campaign.getStatus());

        if (campaign.getManager() != null) {
            response.setManagerId(campaign.getManager().getId());
            response.setManagerName(campaign.getManager().getName());
        }

        response.setStartDate(campaign.getStartDate());
        response.setEndDate(campaign.getEndDate());
        response.setNotes(campaign.getNotes());
        response.setCreatedAt(campaign.getCreatedAt());
        response.setUpdatedAt(campaign.getUpdatedAt());
        response.setUpdatedByName(campaign.getUpdatedBy() != null ? campaign.getUpdatedBy().getName() : null);
        response.setVersion(campaign.getVersion());

        return response;
    }

    private CampaignMonthResponse toMonthResponse(CampaignMonth entry) {

        CampaignMonthResponse response = new CampaignMonthResponse();

        response.setId(entry.getId());
        response.setCampaignId(entry.getCampaign().getId());
        response.setMonth(YearMonth.from(entry.getMonth()));
        response.setEvents(entry.getEvents());
        response.setRevenue(entry.getRevenue());
        response.setCurrency(entry.getCampaign().getCurrency());
        response.setNotes(entry.getNotes());

        response.setUpdatedByName(entry.getUpdatedBy() != null ? entry.getUpdatedBy().getName() : null);
        response.setUpdatedAt(entry.getUpdatedAt());
        response.setVersion(entry.getVersion());

        return response;
    }

    private String normalizeCurrency(String currency) {
        return currency == null || currency.isBlank() ? DEFAULT_CURRENCY : currency.trim().toUpperCase();
    }

    private void validateDateRange(
            LocalDate startDate,
            LocalDate endDate
    ) {

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
