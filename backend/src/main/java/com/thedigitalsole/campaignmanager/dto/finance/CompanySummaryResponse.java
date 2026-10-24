package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * Whole-company money for a period.
 * revenue = campaign monthly revenue, cost = distribution monthly payout, profit = revenue - cost.
 * Amounts are grouped by currency, never mixed. marginPct is null when revenue is 0.
 */
public record CompanySummaryResponse(
        YearMonth from,
        YearMonth to,
        List<Total> totals,
        List<MonthRow> months,
        List<CampaignRow> campaigns,
        // Per partner: revenue from campaigns they gave us vs payout on distributions they run
        List<PartnerBalance> partners
) {

    public record Total(
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct
    ) {
    }

    public record MonthRow(
            YearMonth month,
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            // Campaigns with payout this month but no revenue entered, so profit is understated
            int campaignsMissingRevenue
    ) {
    }

    public record PartnerBalance(
            Long partnerId,
            String partnerName,
            String currency,
            BigDecimal receivable,
            BigDecimal payable,
            BigDecimal net
    ) {
    }

    public record CampaignRow(
            Long campaignId,
            String campaignName,
            String advertiserName,
            boolean direct,
            CampaignStatus status,
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct
    ) {
    }
}
