package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.campaign.*;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignMonth;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.campaign.Geo;
import com.thedigitalsole.campaignmanager.model.campaign.Vertical;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.CampaignMonthRepository;
import com.thedigitalsole.campaignmanager.repository.CampaignRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionRepository;
import com.thedigitalsole.campaignmanager.repository.GeoRepository;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import com.thedigitalsole.campaignmanager.repository.VerticalRepository;
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
    private final GeoRepository geoRepository;
    private final VerticalRepository verticalRepository;
    private final UserRepository userRepository;
    private final PartnerService partnerService;
    private final CurrentUserService currentUserService;

    // =========================
    // GEO
    // =========================

    @Transactional
    public Geo createGeo(CreateGeoRequest request) {

        String code = request.getCode().trim().toUpperCase();

        if (geoRepository.findByCodeIgnoreCase(code).isPresent()) {
            throw new IllegalArgumentException(
                    "A GEO already exists with code: " + code
            );
        }

        Geo geo = new Geo();

        geo.setCode(code);
        geo.setName(request.getName().trim());
        geo.setType(request.getType());
        geo.setRegion(blankToNull(request.getRegion()));

        return geoRepository.save(geo);
    }

    @Transactional(readOnly = true)
    public List<Geo> getAllGeos() {
        return geoRepository.findAll();
    }

    // =========================
    // VERTICAL
    // =========================

    @Transactional
    public Vertical createVertical(CreateVerticalRequest request) {

        String name = request.getName().trim();

        if (verticalRepository.findByNameIgnoreCase(name).isPresent()) {
            throw new IllegalArgumentException(
                    "A vertical already exists with name: " + name
            );
        }

        Vertical vertical = new Vertical();
        vertical.setName(name);

        return verticalRepository.save(vertical);
    }

    @Transactional(readOnly = true)
    public List<Vertical> getAllVerticals() {
        return verticalRepository.findAll();
    }

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
        return toCampaignResponse(findCampaignById(id));
    }

    // =========================
    // FULL UPDATE
    // =========================

    @Transactional
    public CampaignResponse updateCampaign(Long id, CampaignRequest request) {

        Campaign campaign = findCampaignById(id);

        String currency = normalizeCurrency(request.getCurrency());

        // All money in a campaign shares one currency, so it is fixed once money or distributions exist
        if (!currency.equals(campaign.getCurrency())) {

            if (campaignMonthRepository.existsByCampaignId(id) || distributionRepository.existsByCampaignId(id)) {
                throw new IllegalArgumentException(
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

        Campaign campaign = findCampaignById(id);

        // Protect finance history: a campaign with money or distributions is archived, not deleted
        if (distributionRepository.existsByCampaignId(id) || campaignMonthRepository.existsByCampaignId(id)) {
            throw new IllegalArgumentException(
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

        findCampaignById(campaignId);

        return campaignMonthRepository.findByCampaignIdOrderByMonthAsc(campaignId)
                .stream()
                .map(this::toMonthResponse)
                .toList();
    }

    // Creates the month if it does not exist yet, otherwise overwrites it
    @Transactional
    public CampaignMonthResponse saveMonth(Long campaignId, YearMonth month, CampaignMonthRequest request) {

        Campaign campaign = findCampaignById(campaignId);
        LocalDate monthStart = month.atDay(1);

        CampaignMonth entry = campaignMonthRepository
                .findByCampaignIdAndMonth(campaignId, monthStart)
                .orElseGet(() -> {
                    CampaignMonth created = new CampaignMonth();
                    created.setCampaign(campaign);
                    created.setMonth(monthStart);
                    return created;
                });

        entry.setEvents(request.getEvents() != null ? request.getEvents() : 0);
        entry.setRevenue(request.getRevenue());
        entry.setNotes(blankToNull(request.getNotes()));
        entry.setUpdatedBy(currentUserService.currentUser());

        return toMonthResponse(campaignMonthRepository.save(entry));
    }

    @Transactional
    public void deleteMonth(Long campaignId, YearMonth month) {

        CampaignMonth entry = campaignMonthRepository
                .findByCampaignIdAndMonth(campaignId, month.atDay(1))
                .orElseThrow(() ->
                        new IllegalArgumentException(
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
        campaign.setManager(request.getManagerId() != null ? findUserById(request.getManagerId()) : null);
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

    private Campaign findCampaignById(Long id) {

        return campaignRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Campaign not found with id: " + id
                        )
                );
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

    private User findUserById(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "User not found with id: " + id
                        )
                );
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

        if (entry.getUpdatedBy() != null) {
            response.setUpdatedByName(entry.getUpdatedBy().getName());
        }

        response.setUpdatedAt(entry.getUpdatedAt());

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
