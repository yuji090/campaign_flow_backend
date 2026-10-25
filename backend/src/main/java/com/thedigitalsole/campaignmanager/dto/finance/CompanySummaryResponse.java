package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * Whole-company money for a period.
 * revenue = campaign revenue + adjustments, cost = distribution payout + adjustments, profit = revenue - cost.
 * Amounts are grouped by currency, never mixed; {@link Converted} adds everything up in the base currency
 * using the monthly exchange rates. marginPct is null when revenue is 0.
 */
public record CompanySummaryResponse(
        YearMonth from,
        YearMonth to,
        String baseCurrency,
        List<Total> totals,
        // Everything converted to the base currency; null when nothing was entered in the period
        Converted converted,
        List<MonthRow> months,
        List<ConvertedMonth> convertedMonths,
        List<CampaignRow> campaigns,
        // Per partner: what was billed in the period, and what is still outstanding today
        List<PartnerBalance> partners
) {

    public record Total(
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            // Money that actually moved in the period (payments dated in it, write-offs excluded)
            BigDecimal received,
            BigDecimal paid
    ) {
    }

    public record Converted(
            String currency,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            BigDecimal marginPct,
            // "2026-10 EUR" for every month and currency without a rate; those amounts are left out
            List<String> missingRates
    ) {
    }

    public record ConvertedMonth(
            YearMonth month,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            // false when a rate is missing, so some amounts are left out
            boolean complete
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
            int campaignsMissingRevenue,
            // Campaigns with revenue this month but no distribution entries, so profit is overstated
            int campaignsMissingPayouts,
            boolean closed
    ) {
    }

    public record PartnerBalance(
            Long partnerId,
            String partnerName,
            String currency,
            // Billed in the period
            BigDecimal receivable,
            BigDecimal payable,
            BigDecimal net,
            // All time, after payments and write-offs: what they still owe us / we still owe them
            BigDecimal outstandingReceivable,
            BigDecimal outstandingPayable
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
