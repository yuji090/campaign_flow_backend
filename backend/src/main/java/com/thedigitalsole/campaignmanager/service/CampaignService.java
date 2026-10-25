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

import java.math.BigDecimal;
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
public class CampaignService {

    private static final String DEFAULT_CURRENCY = "USD";

    private final CampaignRepository campaignRepository;
    private final CampaignMonthRepository campaignMonthRepository;
    private final DistributionRepository distributionRepository;
    private final UserRepository userRepository;
    private final PartnerService partnerService;
    private final PeriodService periodService;
    private final ChangeLogService changeLogService;

    // =========================
    // CREATE CAMPAIGN
    // =========================

    @Transactional
    public CampaignResponse createCampaign(CampaignRequest request) {

        Campaign campaign = new Campaign();

        campaign.setCurrency(normalizeCurrency(request.getCurrency()));
        applyAdvertiser(campaign, request);
        applyRequest(campaign, request);

        return toCampaignResponse(campaignRepository.save(campaign), false);
    }

    // =========================
    // GET CAMPAIGNS
    // =========================

    @Transactional(readOnly = true)
    public List<CampaignResponse> getAllCampaigns() {

        Set<Long> withMonths = campaignMonthRepository.findCampaignIdsWithMonths();
        Set<Long> withDistributions = distributionRepository.findCampaignIdsWithDistributions();

        return campaignRepository.findAll()
                .stream()
                .map(c -> toCampaignResponse(c, withMonths.contains(c.getId()) || withDistributions.contains(c.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CampaignResponse getCampaignById(Long id) {
        return toCampaignResponse(campaignRepository.getOrThrow(id), hasHistory(id));
    }

    // =========================
    // FULL UPDATE
    // =========================

    @Transactional
    public CampaignResponse updateCampaign(Long id, CampaignRequest request) {

        Campaign campaign = campaignRepository.getOrThrow(id);
        campaign.checkVersion(request.getVersion(), "This campaign");

        boolean locked = hasHistory(id);
        String currency = normalizeCurrency(request.getCurrency());

        // All money in a campaign shares one currency, and belongs to one advertiser.
        // Both are fixed once money or distributions exist; a new agency means a new campaign.
        if (locked) {

            if (!currency.equals(campaign.getCurrency())) {
                throw new ConflictException(
                        "Currency cannot be changed after the campaign has distributions or monthly revenue"
                );
            }

            Long advertiserBefore = campaign.getAdvertiser() != null ? campaign.getAdvertiser().getId() : null;
            Long advertiserAfter = request.isDirect() ? null : request.getAdvertiserId();

            if (campaign.isDirect() != request.isDirect() || !Objects.equals(advertiserBefore, advertiserAfter)) {
                throw new ConflictException(
                        "The advertiser cannot be changed after the campaign has distributions or monthly revenue. "
                                + "If the campaign now comes from someone else, create a new campaign"
                );
            }
        } else {
            campaign.setCurrency(currency);
            applyAdvertiser(campaign, request);
        }

        BigDecimal payoutBefore = campaign.getPayout();

        applyRequest(campaign, request);

        Campaign saved = campaignRepository.save(campaign);

        changeLogService.record(entry("CAMPAIGN", saved.getId(), "UPDATE")
                .campaign(saved.getId())
                .partner(saved.getAdvertiser() != null ? saved.getAdvertiser().getId() : null)
                .summary(new Diff().change("payout", payoutBefore, saved.getPayout()).join("Campaign ")));

        return toCampaignResponse(saved, locked);
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

        Set<YearMonth> closed = periodService.getClosedMonthSet();

        return campaignMonthRepository.findByCampaignIdOrderByMonthAsc(campaignId)
                .stream()
                .map(m -> toMonthResponse(m, closed.contains(YearMonth.from(m.getMonth()))))
                .toList();
    }

    // Creates the month if it does not exist yet, otherwise overwrites it
    @Transactional
    public CampaignMonthResponse saveMonth(Long campaignId, YearMonth month, CampaignMonthRequest request) {

        Campaign campaign = campaignRepository.getOrThrow(campaignId);
        periodService.assertEditable(month);

        LocalDate monthStart = month.atDay(1);
        BigDecimal adjustment = request.getAdjustment() != null ? request.getAdjustment() : BigDecimal.ZERO;
        String adjustmentNote = blankToNull(request.getAdjustmentNote());

        if (adjustment.signum() != 0 && adjustmentNote == null) {
            throw new IllegalArgumentException("Add a reason for the adjustment, e.g. \"Sep fraud clawback\"");
        }

        if (request.getRevenue().add(adjustment).signum() < 0) {
            throw new IllegalArgumentException("Revenue plus adjustment cannot be below zero");
        }

        CampaignMonth entry = campaignMonthRepository
                .findByCampaignIdAndMonth(campaignId, monthStart)
                .orElseGet(() -> {
                    CampaignMonth created = new CampaignMonth();
                    created.setCampaign(campaign);
                    created.setMonth(monthStart);
                    return created;
                });

        boolean isNew = entry.getId() == null;

        if (!isNew) {
            entry.checkVersion(request.getVersion(), month + " revenue");
        }

        long events = request.getEvents() != null ? request.getEvents() : 0L;

        Diff diff = isNew
                ? new Diff().value("revenue", request.getRevenue()).value("adjustment", adjustment).value("approved events", events)
                : new Diff()
                        .change("revenue", entry.getRevenue(), request.getRevenue())
                        .change("adjustment", entry.getAdjustment(), adjustment)
                        .change("approved events", entry.getEvents(), events);

        entry.setEvents(events);
        entry.setRevenue(request.getRevenue());
        entry.setAdjustment(adjustment);
        entry.setAdjustmentNote(adjustment.signum() != 0 ? adjustmentNote : null);
        entry.setNotes(blankToNull(request.getNotes()));

        CampaignMonth saved = campaignMonthRepository.save(entry);

        changeLogService.record(entry("CAMPAIGN_MONTH", saved.getId(), isNew ? "CREATE" : "UPDATE")
                .campaign(campaignId)
                .partner(campaign.getAdvertiser() != null ? campaign.getAdvertiser().getId() : null)
                .month(monthStart)
                .summary(withNote(diff.join(monthLabel(month) + " " + (isNew ? "added" : "edited") + ": "), saved.getAdjustmentNote())));

        return toMonthResponse(saved, false);
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

        periodService.assertOpen(month);

        Campaign campaign = entry.getCampaign();

        changeLogService.record(entry("CAMPAIGN_MONTH", entry.getId(), "DELETE")
                .campaign(campaignId)
                .partner(campaign.getAdvertiser() != null ? campaign.getAdvertiser().getId() : null)
                .month(entry.getMonth())
                .summary(new Diff()
                        .value("revenue", entry.getRevenue())
                        .value("adjustment", entry.getAdjustment())
                        .join(monthLabel(month) + " deleted: ")));

        campaignMonthRepository.delete(entry);
    }

    // =========================
    // HELPERS
    // =========================

    // Sets every field from the request; empty fields are cleared
    private void applyRequest(Campaign campaign, CampaignRequest request) {

        campaign.setName(request.getName().trim());
        campaign.setPricingModel(request.getPricingModel());
        campaign.setPayout(request.getPayout());
        campaign.setStatus(request.getStatus());
        campaign.setManager(request.getManagerId() != null ? userRepository.getOrThrow(request.getManagerId()) : null);
        campaign.setStartDate(request.getStartDate());
        campaign.setEndDate(request.getEndDate());
        campaign.setNotes(blankToNull(request.getNotes()));

        validateDateRange(campaign.getStartDate(), campaign.getEndDate());
    }

    // Direct campaigns have no advertiser; every other campaign needs one
    private void applyAdvertiser(Campaign campaign, CampaignRequest request) {

        campaign.setDirect(request.isDirect());

        if (request.isDirect()) {
            campaign.setAdvertiser(null);
            return;
        }

        if (request.getAdvertiserId() == null) {
            throw new IllegalArgumentException("Advertiser is required when the campaign is not direct");
        }

        campaign.setAdvertiser(findAdvertiser(request.getAdvertiserId()));
    }

    // Money or distributions exist, so advertiser, direct and currency are fixed
    private boolean hasHistory(Long campaignId) {
        return campaignMonthRepository.existsByCampaignId(campaignId) || distributionRepository.existsByCampaignId(campaignId);
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

    private CampaignResponse toCampaignResponse(Campaign campaign, boolean locked) {

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
        response.setLocked(locked);
        response.setVersion(campaign.getVersion());

        return response;
    }

    private CampaignMonthResponse toMonthResponse(CampaignMonth entry, boolean closed) {

        CampaignMonthResponse response = new CampaignMonthResponse();

        response.setId(entry.getId());
        response.setCampaignId(entry.getCampaign().getId());
        response.setMonth(YearMonth.from(entry.getMonth()));
        response.setEvents(entry.getEvents());
        response.setRevenue(entry.getRevenue());
        response.setAdjustment(entry.getAdjustment());
        response.setAdjustmentNote(entry.getAdjustmentNote());
        response.setNetRevenue(entry.netRevenue());
        response.setClosed(closed);
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

    // Appends the adjustment reason to a history line, if there is a line at all
    static String withNote(String summary, String note) {
        return summary == null || note == null ? summary : summary + " (" + note + ")";
    }

    private String blankToNull(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
