package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * Everything we have with one partner.
 * receivable = revenue of campaigns they gave us (they are the advertiser),
 * payable    = payout of distributions they run for us (they are the publisher),
 * net        = receivable - payable.
 * Amounts are grouped by currency, never mixed.
 */
public record PartnerSummaryResponse(
        Long partnerId,
        String companyName,
        boolean advertiser,
        boolean publisher,

        // Campaigns we took from them
        long campaignsTaken,
        long campaignsTakenLive,

        // Our campaigns they are running
        long campaignsRunning,
        long campaignsRunningActive,

        YearMonth from,
        YearMonth to,

        List<Total> totals,
        List<MonthRow> months,

        // Advertiser side: every campaign taken from them, campaign-wise
        List<CampaignRow> campaigns,

        // Publisher side: every distribution they run, distribution-wise
        List<DistributionRow> distributions
) {

    public record Total(
            String currency,
            BigDecimal receivable,
            BigDecimal payable,
            BigDecimal net
    ) {
    }

    public record MonthRow(
            YearMonth month,
            String currency,
            BigDecimal receivable,
            BigDecimal payable,
            BigDecimal net
    ) {
    }

    public record CampaignRow(
            Long campaignId,
            String campaignName,
            CampaignStatus status,
            String currency,
            long events,
            BigDecimal revenue
    ) {
    }

    public record DistributionRow(
            Long distributionId,
            String label,
            Long campaignId,
            String campaignName,
            DistributionStatus status,
            String currency,
            long totalEvents,
            long payableEvents,
            BigDecimal payout
    ) {
    }
}
