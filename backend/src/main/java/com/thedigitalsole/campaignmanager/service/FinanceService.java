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
import com.thedigitalsole.campaignmanager.model.payment.Payment;
import com.thedigitalsole.campaignmanager.model.payment.PaymentDirection;
import com.thedigitalsole.campaignmanager.model.payment.PaymentKind;
import com.thedigitalsole.campaignmanager.repository.*;
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
 * CampaignMonth (revenue + adjustment), DistributionMonth (payout + adjustment)
 * and Payment when asked for, so editing any old month updates every report.
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
    private final PaymentRepository paymentRepository;
    private final PartnerService partnerService;
    private final PeriodService periodService;

    // =========================
    // COMPANY
    // =========================

    public CompanySummaryResponse getCompanySummary(YearMonth from, YearMonth to) {

        Range range = range(from, to);
        Set<YearMonth> closed = periodService.getClosedMonthSet();

        Map<String, Sums> byMonth = new TreeMap<>();
        Map<Long, Sums> byCampaign = new HashMap<>();
        Map<Long, Campaign> campaigns = new HashMap<>();

        // Per partner + currency, billed in the period: receivable (as advertiser) and payable (as publisher)
        Map<String, Sums> byPartner = new HashMap<>();
        Map<Long, String> partnerNames = new HashMap<>();

        // Per month + currency: campaigns with revenue entered, and campaigns with payout entered
        Map<String, Set<Long>> withRevenue = new HashMap<>();
        Map<String, Set<Long>> withCost = new HashMap<>();

        for (CampaignMonth m : campaignMonthRepository.findAllInRange(range.from(), range.to())) {

            Campaign campaign = m.getCampaign();
            String key = monthKey(m.getMonth(), campaign.getCurrency());

            campaigns.putIfAbsent(campaign.getId(), campaign);
            withRevenue.computeIfAbsent(key, k -> new HashSet<>()).add(campaign.getId());

            sums(byMonth, key).addRevenue(m.netRevenue());
            sums(byCampaign, campaign.getId()).addRevenue(m.netRevenue());

            if (campaign.getAdvertiser() != null) {
                Partner advertiser = campaign.getAdvertiser();
                partnerNames.putIfAbsent(advertiser.getId(), advertiser.getCompanyName());
                sums(byPartner, advertiser.getId() + "|" + campaign.getCurrency()).addRevenue(m.netRevenue());
            }
        }

        for (DistributionMonth m : distributionMonthRepository.findAllInRange(range.from(), range.to())) {

            Distribution distribution = m.getDistribution();
            Campaign campaign = distribution.getCampaign();
            String key = monthKey(m.getMonth(), distribution.getCurrency());

            campaigns.putIfAbsent(campaign.getId(), campaign);
            withCost.computeIfAbsent(key, k -> new HashSet<>()).add(campaign.getId());

            sums(byMonth, key).addCost(m.netPayout());
            sums(byCampaign, campaign.getId()).addCost(m.netPayout());

            Partner publisher = distribution.getPublisher();
            partnerNames.putIfAbsent(publisher.getId(), publisher.getCompanyName());
            sums(byPartner, publisher.getId() + "|" + distribution.getCurrency()).addCost(m.netPayout());
        }

        // Which campaigns had a distribution running in each month, to spot missing payout entries
        List<Distribution> allDistributions = distributionRepository.findAll();

        List<CompanySummaryResponse.MonthRow> months = byMonth.entrySet().stream()
                .map(e -> {
                    Sums s = e.getValue();
                    YearMonth month = monthOf(e.getKey());

                    Set<Long> revenueCampaigns = withRevenue.getOrDefault(e.getKey(), Set.of());
                    Set<Long> costCampaigns = withCost.getOrDefault(e.getKey(), Set.of());

                    Set<Long> missingRevenue = new HashSet<>(costCampaigns);
                    missingRevenue.removeAll(revenueCampaigns);

                    long missingPayouts = revenueCampaigns.stream()
                            .filter(id -> !costCampaigns.contains(id))
                            .filter(id -> hasRunningDistribution(allDistributions, id, month))
                            .count();

                    return new CompanySummaryResponse.MonthRow(
                            month, currencyOf(e.getKey()),
                            s.revenue, s.cost, s.profit(), margin(s),
                            missingRevenue.size(), (int) missingPayouts, closed.contains(month));
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

        // Cash that actually moved in the period, per currency
        Map<String, BigDecimal[]> cash = new HashMap<>();

        for (Payment p : paymentRepository.findAllInRange(range.from(), range.lastDay())) {

            if (p.getKind() != PaymentKind.PAYMENT) {
                continue;
            }

            BigDecimal[] moved = cash.computeIfAbsent(p.getCurrency(), k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            int side = p.getDirection() == PaymentDirection.RECEIVED ? 0 : 1;
            moved[side] = moved[side].add(p.getAmount());
        }

        Map<String, Sums> byCurrency = new TreeMap<>();
        byMonth.forEach((key, s) -> sums(byCurrency, currencyOf(key)).add(s));
        cash.keySet().forEach(currency -> sums(byCurrency, currency));

        List<CompanySummaryResponse.Total> totals = byCurrency.entrySet().stream()
                .map(e -> {
                    BigDecimal[] moved = cash.getOrDefault(e.getKey(), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                    return new CompanySummaryResponse.Total(
                            e.getKey(), e.getValue().revenue, e.getValue().cost, e.getValue().profit(), margin(e.getValue()),
                            moved[0], moved[1]);
                })
                .toList();

        // Convert every month + currency into the base currency
        Map<String, BigDecimal> rates = periodService.getRateMap(range.from(), range.to());
        Map<YearMonth, Sums> convertedByMonth = new TreeMap<>();
        Set<YearMonth> incomplete = new HashSet<>();
        List<String> missingRates = new ArrayList<>();

        byMonth.forEach((key, s) -> {
            YearMonth month = monthOf(key);
            String currency = currencyOf(key);
            BigDecimal rate = periodService.rate(rates, month, currency);
            Sums converted = sums(convertedByMonth, month);

            if (rate == null) {
                incomplete.add(month);
                missingRates.add(month + " " + currency);
                return;
            }

            converted.addRevenue(s.revenue.multiply(rate));
            converted.addCost(s.cost.multiply(rate));
        });

        List<CompanySummaryResponse.ConvertedMonth> convertedMonths = convertedByMonth.entrySet().stream()
                .map(e -> new CompanySummaryResponse.ConvertedMonth(
                        e.getKey(), money(e.getValue().revenue), money(e.getValue().cost), money(e.getValue().profit()),
                        !incomplete.contains(e.getKey())))
                .toList();

        Sums convertedTotal = new Sums();
        convertedByMonth.values().forEach(convertedTotal::add);

        CompanySummaryResponse.Converted converted = byMonth.isEmpty() ? null : new CompanySummaryResponse.Converted(
                periodService.getBaseCurrency(),
                money(convertedTotal.revenue), money(convertedTotal.cost), money(convertedTotal.profit()),
                margin(convertedTotal), missingRates);

        // Outstanding is always all time, whatever the period
        Map<String, Balance> balances = allBalances();

        balances.forEach((key, b) -> {
            Long partnerId = partnerIdOf(key);
            partnerNames.putIfAbsent(partnerId, b.partnerName);
            if (b.hasActivity()) {
                sums(byPartner, key);
            }
        });

        // Biggest outstanding first, whichever direction it goes
        List<CompanySummaryResponse.PartnerBalance> partnerRows = byPartner.entrySet().stream()
                .map(e -> {
                    Long partnerId = partnerIdOf(e.getKey());
                    Sums s = e.getValue();
                    Balance b = balances.getOrDefault(e.getKey(), new Balance(partnerNames.get(partnerId)));
                    return new CompanySummaryResponse.PartnerBalance(
                            partnerId, partnerNames.get(partnerId), currencyOf(e.getKey()),
                            s.revenue, s.cost, s.profit(),
                            b.outstandingReceivable(), b.outstandingPayable());
                })
                .sorted(Comparator.comparing((CompanySummaryResponse.PartnerBalance p) ->
                        p.outstandingReceivable().abs().max(p.outstandingPayable().abs())).reversed())
                .toList();

        return new CompanySummaryResponse(
                from, to, periodService.getBaseCurrency(),
                totals, converted, months, convertedMonths, campaignRows, partnerRows);
    }

    // =========================
    // CAMPAIGN
    // =========================

    public CampaignSummaryResponse getCampaignSummary(Long campaignId, YearMonth from, YearMonth to) {

        Range range = range(from, to);
        Set<YearMonth> closed = periodService.getClosedMonthSet();

        Campaign campaign = campaignRepository.getOrThrow(campaignId);
        List<Distribution> campaignDistributions = distributionRepository.findByCampaignId(campaignId);

        Map<LocalDate, Sums> byMonth = new TreeMap<>();
        Set<LocalDate> revenueEntered = new HashSet<>();

        for (CampaignMonth m : campaignMonthRepository.findByCampaignInRange(campaignId, range.from(), range.to())) {

            Sums s = sums(byMonth, m.getMonth());
            s.addRevenue(m.netRevenue());
            s.adjustment = s.adjustment.add(m.getAdjustment());
            s.advertiserEvents += m.getEvents();

            revenueEntered.add(m.getMonth());
        }

        Map<LocalDate, List<DistributionMonth>> costByMonth = new HashMap<>();
        Map<Long, Sums> byDistribution = new HashMap<>();

        for (DistributionMonth m : distributionMonthRepository.findByCampaignInRange(campaignId, range.from(), range.to())) {

            Sums s = sums(byMonth, m.getMonth());
            s.addCost(m.netPayout());
            s.totalEvents += m.getTotalEvents();
            s.payableEvents += m.getPayableEvents();
            s.addApproved(m.getApprovedEvents());

            Sums d = sums(byDistribution, m.getDistribution().getId());
            d.addCost(m.netPayout());
            d.totalEvents += m.getTotalEvents();
            d.payableEvents += m.getPayableEvents();
            d.addApproved(m.getApprovedEvents());

            // A month without revenue cannot be estimated yet; keep its payout aside
            if (revenueEntered.contains(m.getMonth())) {
                d.estimatedCost = d.estimatedCost.add(m.netPayout());
                d.estimated = true;
            } else {
                d.pendingCost = d.pendingCost.add(m.netPayout());
            }

            costByMonth.computeIfAbsent(m.getMonth(), k -> new ArrayList<>()).add(m);
        }

        // Split each month's revenue across that month's distributions (estimate, display only)
        BigDecimal unallocated = BigDecimal.ZERO;

        for (LocalDate month : revenueEntered) {
            unallocated = unallocated.add(
                    allocateRevenue(byMonth.get(month).revenue, costByMonth.getOrDefault(month, List.of()), byDistribution));
        }

        List<CampaignSummaryResponse.Month> months = byMonth.entrySet().stream()
                .map(e -> {
                    Sums s = e.getValue();
                    YearMonth month = YearMonth.from(e.getKey());
                    boolean hasRevenue = revenueEntered.contains(e.getKey());
                    boolean missingPayouts = hasRevenue
                            && !costByMonth.containsKey(e.getKey())
                            && hasRunningDistribution(campaignDistributions, campaignId, month);

                    return new CampaignSummaryResponse.Month(
                            month, hasRevenue,
                            s.revenue, s.adjustment, s.cost, s.profit(), margin(s),
                            s.advertiserEvents, s.totalEvents, s.payableEvents, s.approvedEvents,
                            missingPayouts, closed.contains(month));
                })
                .toList();

        Sums total = new Sums();
        byMonth.values().forEach(total::add);

        BigDecimal pendingCost = byMonth.entrySet().stream()
                .filter(e -> !revenueEntered.contains(e.getKey()))
                .map(e -> e.getValue().cost)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<CampaignSummaryResponse.DistributionRow> distributions = campaignDistributions.stream()
                .map(d -> {
                    Sums s = byDistribution.getOrDefault(d.getId(), new Sums());
                    BigDecimal estimatedRevenue = s.estimated ? money(s.estimatedRevenue) : null;
                    BigDecimal estimatedProfit = s.estimated ? money(s.estimatedRevenue.subtract(s.estimatedCost)) : null;

                    return new CampaignSummaryResponse.DistributionRow(
                            d.getId(), d.getLabel(), d.getPublisher().getId(), d.getPublisher().getCompanyName(),
                            d.getStatus(), s.totalEvents, s.payableEvents, s.approvedEvents, s.cost,
                            estimatedRevenue, estimatedProfit, s.pendingCost);
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
                        total.advertiserEvents, total.totalEvents, total.payableEvents,
                        money(unallocated), pendingCost),
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

            sums(byMonth, monthKey(m.getMonth(), m.getCampaign().getCurrency())).addRevenue(m.netRevenue());

            Sums c = sums(byCampaign, m.getCampaign().getId());
            c.addRevenue(m.netRevenue());
            c.advertiserEvents += m.getEvents();
        }

        for (DistributionMonth m : distributionMonthRepository.findByPublisherInRange(partnerId, range.from(), range.to())) {

            sums(byMonth, monthKey(m.getMonth(), m.getDistribution().getCurrency())).addCost(m.netPayout());

            Sums d = sums(byDistribution, m.getDistribution().getId());
            d.addCost(m.netPayout());
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

        List<PartnerSummaryResponse.Balance> balances = partnerBalances(partner).entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> {
                    Balance b = e.getValue();
                    return new PartnerSummaryResponse.Balance(
                            currencyOf(e.getKey()),
                            b.billedReceivable, b.received, b.writtenOffReceivable, b.outstandingReceivable(),
                            b.billedPayable, b.paid, b.writtenOffPayable, b.outstandingPayable());
                })
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
                balances,
                months,
                campaignRows,
                distributionRows
        );
    }

    // =========================
    // BALANCES
    // =========================

    // All partners, all time, keyed "partnerId|currency"
    private Map<String, Balance> allBalances() {

        Map<String, Balance> balances = new HashMap<>();

        for (CampaignMonth m : campaignMonthRepository.findAllInRange(ALL_TIME_FROM, ALL_TIME_TO)) {
            Partner advertiser = m.getCampaign().getAdvertiser();
            if (advertiser != null) {
                Balance b = balance(balances, advertiser, m.getCampaign().getCurrency());
                b.billedReceivable = b.billedReceivable.add(m.netRevenue());
            }
        }

        for (DistributionMonth m : distributionMonthRepository.findAllInRange(ALL_TIME_FROM, ALL_TIME_TO)) {
            Balance b = balance(balances, m.getDistribution().getPublisher(), m.getDistribution().getCurrency());
            b.billedPayable = b.billedPayable.add(m.netPayout());
        }

        for (Payment p : paymentRepository.findAllWithPartner()) {
            balance(balances, p.getPartner(), p.getCurrency()).apply(p);
        }

        return balances;
    }

    // One partner, all time, keyed "partnerId|currency"
    private Map<String, Balance> partnerBalances(Partner partner) {

        Map<String, Balance> balances = new HashMap<>();

        for (CampaignMonth m : campaignMonthRepository.findByAdvertiserInRange(partner.getId(), ALL_TIME_FROM, ALL_TIME_TO)) {
            Balance b = balance(balances, partner, m.getCampaign().getCurrency());
            b.billedReceivable = b.billedReceivable.add(m.netRevenue());
        }

        for (DistributionMonth m : distributionMonthRepository.findByPublisherInRange(partner.getId(), ALL_TIME_FROM, ALL_TIME_TO)) {
            Balance b = balance(balances, partner, m.getDistribution().getCurrency());
            b.billedPayable = b.billedPayable.add(m.netPayout());
        }

        for (Payment p : paymentRepository.findByPartnerIdOrderByDateDescIdDesc(partner.getId())) {
            balance(balances, partner, p.getCurrency()).apply(p);
        }

        return balances;
    }

    private static Balance balance(Map<String, Balance> balances, Partner partner, String currency) {
        return balances.computeIfAbsent(partner.getId() + "|" + currency, k -> new Balance(partner.getCompanyName()));
    }

    // =========================
    // HELPERS
    // =========================

    /**
     * Splits one month's campaign revenue across that month's distributions.
     * Uses advertiser-approved events when every distribution has them, otherwise payable events.
     * The last row takes the rounding remainder, so the parts always add up to the revenue.
     * Returns the revenue that could not be split (no rows, or no events to split by).
     */
    private BigDecimal allocateRevenue(BigDecimal revenue, List<DistributionMonth> rows, Map<Long, Sums> byDistribution) {

        if (revenue.signum() == 0) {
            return BigDecimal.ZERO;
        }

        boolean useApproved = !rows.isEmpty() && rows.stream().allMatch(r -> r.getApprovedEvents() != null);

        long totalWeight = rows.stream().mapToLong(r -> weight(r, useApproved)).sum();

        if (totalWeight == 0) {
            return revenue;
        }

        BigDecimal remaining = revenue;
        List<DistributionMonth> weighted = rows.stream().filter(r -> weight(r, useApproved) > 0).toList();

        for (int i = 0; i < weighted.size(); i++) {

            DistributionMonth row = weighted.get(i);

            BigDecimal part = i == weighted.size() - 1
                    ? remaining
                    : revenue.multiply(BigDecimal.valueOf(weight(row, useApproved)))
                            .divide(BigDecimal.valueOf(totalWeight), 4, RoundingMode.HALF_UP);

            remaining = remaining.subtract(part);

            Sums s = sums(byDistribution, row.getDistribution().getId());
            s.estimatedRevenue = s.estimatedRevenue.add(part);
        }

        return BigDecimal.ZERO;
    }

    private static long weight(DistributionMonth row, boolean useApproved) {
        return useApproved ? row.getApprovedEvents() : row.getPayableEvents();
    }

    /**
     * True when the campaign had a distribution running in the month:
     * started (start date, or created date when none) on or before the month's end,
     * and not ended before the month began.
     */
    private static boolean hasRunningDistribution(List<Distribution> distributions, Long campaignId, YearMonth month) {

        return distributions.stream()
                .filter(d -> d.getCampaign().getId().equals(campaignId))
                .anyMatch(d -> {
                    LocalDate start = d.getStartDate() != null
                            ? d.getStartDate()
                            : d.getCreatedAt() != null ? d.getCreatedAt().toLocalDate() : null;

                    boolean started = start == null || !start.isAfter(month.atEndOfMonth());
                    boolean notEnded = d.getEndDate() == null || !d.getEndDate().isBefore(month.atDay(1));

                    return started && notEnded;
                });
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
    private static BigDecimal margin(Sums s) {

        if (s.revenue.signum() == 0) {
            return null;
        }

        return s.profit()
                .multiply(BigDecimal.valueOf(100))
                .divide(s.revenue, 2, RoundingMode.HALF_UP);
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(4, RoundingMode.HALF_UP);
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

    private static Long partnerIdOf(String key) {
        return Long.valueOf(key.substring(0, key.indexOf('|')));
    }

    private record Range(LocalDate from, LocalDate to) {

        // Payments are dated on any day, so they need the month's last day
        LocalDate lastDay() {
            return YearMonth.from(to).atEndOfMonth();
        }
    }

    /** Running totals while grouping. revenue doubles as receivable and cost as payable for partners. */
    private static final class Sums {

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal adjustment = BigDecimal.ZERO;
        BigDecimal cost = BigDecimal.ZERO;
        long advertiserEvents;
        long totalEvents;
        long payableEvents;
        // null until some approved events are entered
        Long approvedEvents;

        // Distribution estimates: only months with revenue entered count
        boolean estimated;
        BigDecimal estimatedRevenue = BigDecimal.ZERO;
        BigDecimal estimatedCost = BigDecimal.ZERO;
        BigDecimal pendingCost = BigDecimal.ZERO;

        void addRevenue(BigDecimal amount) {
            revenue = revenue.add(amount);
        }

        void addCost(BigDecimal amount) {
            cost = cost.add(amount);
        }

        void addApproved(Long events) {
            if (events != null) {
                approvedEvents = (approvedEvents != null ? approvedEvents : 0L) + events;
            }
        }

        void add(Sums other) {
            revenue = revenue.add(other.revenue);
            adjustment = adjustment.add(other.adjustment);
            cost = cost.add(other.cost);
            advertiserEvents += other.advertiserEvents;
            totalEvents += other.totalEvents;
            payableEvents += other.payableEvents;
            addApproved(other.approvedEvents);
        }

        BigDecimal profit() {
            return revenue.subtract(cost);
        }
    }

    /** One partner's all-time position in one currency. */
    private static final class Balance {

        final String partnerName;
        BigDecimal billedReceivable = BigDecimal.ZERO;
        BigDecimal received = BigDecimal.ZERO;
        BigDecimal writtenOffReceivable = BigDecimal.ZERO;
        BigDecimal billedPayable = BigDecimal.ZERO;
        BigDecimal paid = BigDecimal.ZERO;
        BigDecimal writtenOffPayable = BigDecimal.ZERO;

        Balance(String partnerName) {
            this.partnerName = partnerName;
        }

        void apply(Payment p) {

            boolean writeOff = p.getKind() == PaymentKind.WRITE_OFF;

            if (p.getDirection() == PaymentDirection.RECEIVED) {
                if (writeOff) writtenOffReceivable = writtenOffReceivable.add(p.cleared());
                else received = received.add(p.cleared());
            } else {
                if (writeOff) writtenOffPayable = writtenOffPayable.add(p.cleared());
                else paid = paid.add(p.cleared());
            }
        }

        BigDecimal outstandingReceivable() {
            return billedReceivable.subtract(received).subtract(writtenOffReceivable);
        }

        BigDecimal outstandingPayable() {
            return billedPayable.subtract(paid).subtract(writtenOffPayable);
        }

        // Anything still open, so the partner shows up even if nothing was billed in the period
        boolean hasActivity() {
            return outstandingReceivable().signum() != 0 || outstandingPayable().signum() != 0;
        }
    }
}
