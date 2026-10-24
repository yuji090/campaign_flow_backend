package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.finance.CampaignSummaryResponse;
import com.thedigitalsole.campaignmanager.dto.finance.CompanySummaryResponse;
import com.thedigitalsole.campaignmanager.dto.finance.PartnerSummaryResponse;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignMonth;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.distribution.Distribution;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionMonth;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.repository.CampaignMonthRepository;
import com.thedigitalsole.campaignmanager.repository.CampaignRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionMonthRepository;
import com.thedigitalsole.campaignmanager.repository.DistributionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

/**
 * All money calculations. Nothing is stored: every total is summed from
 * CampaignMonth (revenue) and DistributionMonth (payout) when asked for,
 * so editing any old month updates every report.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FinanceService {

    // Used when no date filter is given, so a summary covers all time
    private static final LocalDate ALL_TIME_FROM = LocalDate.of(2000, 1, 1);
    private static final LocalDate ALL_TIME_TO = LocalDate.of(9999, 12, 1);

    private final CampaignRepository campaignRepository;
    private final CampaignMonthRepository campaignMonthRepository;
    private final DistributionRepository distributionRepository;
    private final DistributionMonthRepository distributionMonthRepository;
    private final PartnerService partnerService;

    // =========================
    // COMPANY
    // =========================

    public CompanySummaryResponse getCompanySummary(YearMonth from, YearMonth to) {

        Range range = range(from, to);

        Map<String, Sums> byMonth = new TreeMap<>();
        Map<Long, Sums> byCampaign = new HashMap<>();
        Map<Long, Campaign> campaigns = new HashMap<>();

        // Per month + currency: campaigns with revenue entered, and campaigns with payout
        Map<String, Set<Long>> withRevenue = new HashMap<>();
        Map<String, Set<Long>> withCost = new HashMap<>();

        for (CampaignMonth m : campaignMonthRepository.findAllInRange(range.from(), range.to())) {

            Campaign campaign = m.getCampaign();
            campaigns.putIfAbsent(campaign.getId(), campaign);
            withRevenue.computeIfAbsent(monthKey(m.getMonth(), campaign.getCurrency()), k -> new HashSet<>())
                    .add(campaign.getId());

            sums(byMonth, monthKey(m.getMonth(), campaign.getCurrency())).addRevenue(m.getRevenue());
            sums(byCampaign, campaign.getId()).addRevenue(m.getRevenue());
        }

        for (DistributionMonth m : distributionMonthRepository.findAllInRange(range.from(), range.to())) {

            Campaign campaign = m.getDistribution().getCampaign();
            campaigns.putIfAbsent(campaign.getId(), campaign);
            withCost.computeIfAbsent(monthKey(m.getMonth(), m.getDistribution().getCurrency()), k -> new HashSet<>())
                    .add(campaign.getId());

            sums(byMonth, monthKey(m.getMonth(), m.getDistribution().getCurrency())).addCost(m.getPayout());
            sums(byCampaign, campaign.getId()).addCost(m.getPayout());
        }

        List<CompanySummaryResponse.MonthRow> months = byMonth.entrySet().stream()
                .map(e -> {
                    Sums s = e.getValue();

                    Set<Long> missing = new HashSet<>(withCost.getOrDefault(e.getKey(), Set.of()));
                    missing.removeAll(withRevenue.getOrDefault(e.getKey(), Set.of()));

                    return new CompanySummaryResponse.MonthRow(
                            monthOf(e.getKey()), currencyOf(e.getKey()),
                            s.revenue, s.cost, s.profit(), margin(s), missing.size());
                })
                .toList();

        List<CompanySummaryResponse.CampaignRow> campaignRows = byCampaign.entrySet().stream()
                .map(e -> {
                    Campaign c = campaigns.get(e.getKey());
                    Sums s = e.getValue();
                    return new CompanySummaryResponse.CampaignRow(
                            c.getId(), c.getName(),
                            c.getAdvertiser() != null ? c.getAdvertiser().getCompanyName() : null,
                            c.isDirect(), c.getStatus(), c.getCurrency(),
                            s.revenue, s.cost, s.profit(), margin(s));
                })
                .sorted(Comparator.comparing(CompanySummaryResponse.CampaignRow::revenue).reversed())
                .toList();

        Map<String, Sums> byCurrency = new TreeMap<>();
        byMonth.forEach((key, s) -> sums(byCurrency, currencyOf(key)).add(s));

        List<CompanySummaryResponse.Total> totals = byCurrency.entrySet().stream()
                .map(e -> new CompanySummaryResponse.Total(
                        e.getKey(), e.getValue().revenue, e.getValue().cost, e.getValue().profit(), margin(e.getValue())))
                .toList();

        return new CompanySummaryResponse(from, to, totals, months, campaignRows);
    }

    // =========================
    // CAMPAIGN
    // =========================

    public CampaignSummaryResponse getCampaignSummary(Long campaignId, YearMonth from, YearMonth to) {

        Range range = range(from, to);

        Campaign campaign = campaignRepository.getOrThrow(campaignId);

        Map<LocalDate, Sums> byMonth = new TreeMap<>();
        Set<LocalDate> revenueEntered = new HashSet<>();

        for (CampaignMonth m : campaignMonthRepository.findByCampaignInRange(campaignId, range.from(), range.to())) {

            Sums s = sums(byMonth, m.getMonth());
            s.addRevenue(m.getRevenue());
            s.advertiserEvents += m.getEvents();

            revenueEntered.add(m.getMonth());
        }

        Map<LocalDate, List<DistributionMonth>> costByMonth = new HashMap<>();
        Map<Long, Sums> byDistribution = new HashMap<>();

        for (DistributionMonth m : distributionMonthRepository.findByCampaignInRange(campaignId, range.from(), range.to())) {

            Sums s = sums(byMonth, m.getMonth());
            s.addCost(m.getPayout());
            s.totalEvents += m.getTotalEvents();
            s.payableEvents += m.getPayableEvents();

            Sums d = sums(byDistribution, m.getDistribution().getId());
            d.addCost(m.getPayout());
            d.totalEvents += m.getTotalEvents();
            d.payableEvents += m.getPayableEvents();

            costByMonth.computeIfAbsent(m.getMonth(), k -> new ArrayList<>()).add(m);
        }

        // Split each month's revenue across that month's distributions (estimate, display only)
        byMonth.forEach((month, s) ->
                allocateRevenue(s.revenue, costByMonth.getOrDefault(month, List.of()), byDistribution));

        List<CampaignSummaryResponse.Month> months = byMonth.entrySet().stream()
                .map(e -> {
                    Sums s = e.getValue();
                    return new CampaignSummaryResponse.Month(
                            YearMonth.from(e.getKey()), revenueEntered.contains(e.getKey()),
                            s.revenue, s.cost, s.profit(), margin(s),
                            s.advertiserEvents, s.totalEvents, s.payableEvents);
                })
                .toList();

        Sums total = new Sums();
        byMonth.values().forEach(total::add);

        List<CampaignSummaryResponse.DistributionRow> distributions = distributionRepository.findByCampaignId(campaignId)
                .stream()
                .map(d -> {
                    Sums s = byDistribution.getOrDefault(d.getId(), new Sums());
                    return new CampaignSummaryResponse.DistributionRow(
                            d.getId(), d.getLabel(), d.getPublisher().getId(), d.getPublisher().getCompanyName(),
                            d.getStatus(), s.totalEvents, s.payableEvents, s.cost,
                            s.estimatedRevenue, s.estimatedRevenue.subtract(s.cost));
                })
                .toList();

        return new CampaignSummaryResponse(
                campaign.getId(),
                campaign.getName(),
                campaign.getCurrency(),
                from,
                to,
                new CampaignSummaryResponse.Totals(
                        total.revenue, total.cost, total.profit(), margin(total),
                        total.advertiserEvents, total.totalEvents, total.payableEvents),
                months,
                distributions
        );
    }

    // =========================
    // PARTNER
    // =========================

    public PartnerSummaryResponse getPartnerSummary(Long partnerId, YearMonth from, YearMonth to) {

        Range range = range(from, to);

        Partner partner = partnerService.findPartnerById(partnerId);

        List<Campaign> campaignsTaken = campaignRepository.findByAdvertiserId(partnerId);
        List<Distribution> distributionsRun = distributionRepository.findByPublisherId(partnerId);

        // receivable = revenue, payable = cost
        Map<String, Sums> byMonth = new TreeMap<>();
        Map<Long, Sums> byCampaign = new HashMap<>();
        Map<Long, Sums> byDistribution = new HashMap<>();

        for (CampaignMonth m : campaignMonthRepository.findByAdvertiserInRange(partnerId, range.from(), range.to())) {

            sums(byMonth, monthKey(m.getMonth(), m.getCampaign().getCurrency())).addRevenue(m.getRevenue());

            Sums c = sums(byCampaign, m.getCampaign().getId());
            c.addRevenue(m.getRevenue());
            c.advertiserEvents += m.getEvents();
        }

        for (DistributionMonth m : distributionMonthRepository.findByPublisherInRange(partnerId, range.from(), range.to())) {

            sums(byMonth, monthKey(m.getMonth(), m.getDistribution().getCurrency())).addCost(m.getPayout());

            Sums d = sums(byDistribution, m.getDistribution().getId());
            d.addCost(m.getPayout());
            d.totalEvents += m.getTotalEvents();
            d.payableEvents += m.getPayableEvents();
        }

        List<PartnerSummaryResponse.MonthRow> months = byMonth.entrySet().stream()
                .map(e -> new PartnerSummaryResponse.MonthRow(
                        monthOf(e.getKey()), currencyOf(e.getKey()),
                        e.getValue().revenue, e.getValue().cost, e.getValue().profit()))
                .toList();

        Map<String, Sums> byCurrency = new TreeMap<>();
        byMonth.forEach((key, s) -> sums(byCurrency, currencyOf(key)).add(s));

        List<PartnerSummaryResponse.Total> totals = byCurrency.entrySet().stream()
                .map(e -> new PartnerSummaryResponse.Total(
                        e.getKey(), e.getValue().revenue, e.getValue().cost, e.getValue().profit()))
                .toList();

        // Every campaign and distribution is listed, with zero when nothing is entered yet
        List<PartnerSummaryResponse.CampaignRow> campaignRows = campaignsTaken.stream()
                .sorted(Comparator.comparing(Campaign::getName, String.CASE_INSENSITIVE_ORDER))
                .map(c -> {
                    Sums s = byCampaign.getOrDefault(c.getId(), new Sums());
                    return new PartnerSummaryResponse.CampaignRow(
                            c.getId(), c.getName(), c.getStatus(), c.getCurrency(), s.advertiserEvents, s.revenue);
                })
                .toList();

        List<PartnerSummaryResponse.DistributionRow> distributionRows = distributionsRun.stream()
                .sorted(Comparator.comparing((Distribution d) -> d.getCampaign().getName(), String.CASE_INSENSITIVE_ORDER))
                .map(d -> {
                    Sums s = byDistribution.getOrDefault(d.getId(), new Sums());
                    return new PartnerSummaryResponse.DistributionRow(
                            d.getId(), d.getLabel(), d.getCampaign().getId(), d.getCampaign().getName(),
                            d.getStatus(), d.getCurrency(), s.totalEvents, s.payableEvents, s.cost);
                })
                .toList();

        Set<Long> campaignsRunning = distributionsRun.stream()
                .map(d -> d.getCampaign().getId())
                .collect(Collectors.toSet());

        Set<Long> campaignsRunningActive = distributionsRun.stream()
                .filter(d -> d.getStatus() == DistributionStatus.ACTIVE)
                .map(d -> d.getCampaign().getId())
                .collect(Collectors.toSet());

        return new PartnerSummaryResponse(
                partner.getId(),
                partner.getCompanyName(),
                partner.isAdvertiser(),
                partner.isPublisher(),
                campaignsTaken.size(),
                campaignsTaken.stream().filter(c -> c.getStatus() == CampaignStatus.LIVE).count(),
                campaignsRunning.size(),
                campaignsRunningActive.size(),
                from,
                to,
                totals,
                months,
                campaignRows,
                distributionRows
        );
    }

    // =========================
    // HELPERS
    // =========================

    /**
     * Splits one month's campaign revenue across that month's distributions by payable events.
     * Falls back to payout share when no events were entered, and to nothing when both are zero.
     */
    private void allocateRevenue(BigDecimal revenue, List<DistributionMonth> rows, Map<Long, Sums> byDistribution) {

        if (revenue.signum() == 0 || rows.isEmpty()) {
            return;
        }

        long totalPayable = rows.stream().mapToLong(DistributionMonth::getPayableEvents).sum();
        BigDecimal totalPayout = rows.stream().map(DistributionMonth::getPayout).reduce(BigDecimal.ZERO, BigDecimal::add);

        for (DistributionMonth row : rows) {

            BigDecimal share;

            if (totalPayable > 0) {
                share = BigDecimal.valueOf(row.getPayableEvents())
                        .divide(BigDecimal.valueOf(totalPayable), 10, RoundingMode.HALF_UP);
            } else if (totalPayout.signum() > 0) {
                share = row.getPayout().divide(totalPayout, 10, RoundingMode.HALF_UP);
            } else {
                continue;
            }

            Sums s = sums(byDistribution, row.getDistribution().getId());
            s.estimatedRevenue = s.estimatedRevenue.add(revenue.multiply(share).setScale(4, RoundingMode.HALF_UP));
        }
    }

    private Range range(YearMonth from, YearMonth to) {

        if (from != null && to != null && to.isBefore(from)) {
            throw new IllegalArgumentException("'to' month cannot be before 'from' month");
        }

        return new Range(
                from != null ? from.atDay(1) : ALL_TIME_FROM,
                to != null ? to.atDay(1) : ALL_TIME_TO
        );
    }

    // Profit as a percentage of revenue, null when there is no revenue
    private BigDecimal margin(Sums s) {

        if (s.revenue.signum() == 0) {
            return null;
        }

        return s.profit()
                .multiply(BigDecimal.valueOf(100))
                .divide(s.revenue, 2, RoundingMode.HALF_UP);
    }

    private static <K> Sums sums(Map<K, Sums> map, K key) {
        return map.computeIfAbsent(key, k -> new Sums());
    }

    // Month + currency key, sorts by month then currency
    private static String monthKey(LocalDate month, String currency) {
        return YearMonth.from(month) + "|" + currency;
    }

    private static YearMonth monthOf(String key) {
        return YearMonth.parse(key.substring(0, key.indexOf('|')));
    }

    private static String currencyOf(String key) {
        return key.substring(key.indexOf('|') + 1);
    }

    private record Range(LocalDate from, LocalDate to) {
    }

    /** Running totals while grouping. revenue doubles as receivable and cost as payable for partners. */
    private static final class Sums {

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cost = BigDecimal.ZERO;
        BigDecimal estimatedRevenue = BigDecimal.ZERO;
        long advertiserEvents;
        long totalEvents;
        long payableEvents;

        void addRevenue(BigDecimal amount) {
            revenue = revenue.add(amount);
        }

        void addCost(BigDecimal amount) {
            cost = cost.add(amount);
        }

        void add(Sums other) {
            revenue = revenue.add(other.revenue);
            cost = cost.add(other.cost);
            estimatedRevenue = estimatedRevenue.add(other.estimatedRevenue);
            advertiserEvents += other.advertiserEvents;
            totalEvents += other.totalEvents;
            payableEvents += other.payableEvents;
        }

        BigDecimal profit() {
            return revenue.subtract(cost);
        }
    }
}
