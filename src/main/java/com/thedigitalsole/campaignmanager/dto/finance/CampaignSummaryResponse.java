package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * One campaign's money for a period, all in the campaign's currency.
 * Revenue is entered per month on the campaign; cost is summed from its distributions.
 * Events let you compare what the advertiser approved, what publishers sent, and what we pay for.
 */
public record CampaignSummaryResponse(
        Long campaignId,
        String campaignName,
        String currency,
        YearMonth from,
        YearMonth to,
        Totals totals,
        List<Month> months,
        List<DistributionRow> distributions
) {

    public record Totals(
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            long advertiserEvents,
            long totalEvents,
            long payableEvents
    ) {
    }

    public record Month(
            YearMonth month,
            // false = no revenue entered for this month yet
            boolean revenueEntered,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            long advertiserEvents,
            long totalEvents,
            long payableEvents
    ) {
    }

    /**
     * estimatedRevenue splits each month's campaign revenue across distributions
     * by their share of payable events (or payout, when no events were entered). Display only.
     */
    public record DistributionRow(
            Long distributionId,
            String label,
            Long publisherId,
            String publisherName,
            DistributionStatus status,
            long totalEvents,
            long payableEvents,
            BigDecimal payout,
            BigDecimal estimatedRevenue,
            BigDecimal estimatedProfit
    ) {
    }
}
