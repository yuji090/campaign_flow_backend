package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * One campaign's money for a period, all in the campaign's currency.
 * Revenue is entered per month on the campaign; cost is summed from its distributions.
 * Both include adjustments. Events let you compare what the advertiser approved,
 * what publishers sent, and what we pay for.
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
            long payableEvents,
            // Revenue of months where no distribution had events to split it by
            BigDecimal unallocatedRevenue,
            // Payout of months whose revenue is not entered yet (left out of estimated profit)
            BigDecimal pendingCost
    ) {
    }

    public record Month(
            YearMonth month,
            // false = no revenue entered for this month yet
            boolean revenueEntered,
            // Revenue includes the adjustment
            BigDecimal revenue,
            BigDecimal adjustment,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            long advertiserEvents,
            long totalEvents,
            long payableEvents,
            // Sum of advertiser-approved events entered on distributions; null when none entered
            Long approvedEvents,
            // Revenue entered but a running distribution has no entry, so profit is overstated
            boolean missingPayouts,
            boolean closed
    ) {
    }

    /**
     * estimatedRevenue splits each month's campaign revenue across that month's distributions
     * by advertiser-approved events (when every distribution has them) or payable events.
     * Months without revenue are left out of both estimatedRevenue and estimatedProfit;
     * their payout is in pendingPayout. Both estimates are null when no month qualifies. Display only.
     */
    public record DistributionRow(
            Long distributionId,
            String label,
            Long publisherId,
            String publisherName,
            DistributionStatus status,
            long totalEvents,
            long payableEvents,
            Long approvedEvents,
            BigDecimal payout,
            BigDecimal estimatedRevenue,
            BigDecimal estimatedProfit,
            BigDecimal pendingPayout
    ) {
    }
}
