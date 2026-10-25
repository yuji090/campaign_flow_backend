package com.thedigitalsole.campaignmanager.dto.finance;

import com.thedigitalsole.campaignmanager.dto.campaign.CampaignMonthResponse;
import com.thedigitalsole.campaignmanager.dto.distribution.MonthEntryResponse;
import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.campaign.PricingModel;
import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

/**
 * Everything to enter for one month on one screen: each running campaign with its
 * revenue entry, and each of its distributions with their events/payout entry.
 * entry is null when nothing is saved for the month yet.
 */
public record MonthEntriesResponse(
        YearMonth month,
        boolean closed,
        List<CampaignEntry> campaigns
) {

    public record CampaignEntry(
            Long campaignId,
            String campaignName,
            String advertiserName,
            boolean direct,
            PricingModel pricingModel,
            CampaignStatus status,
            String currency,
            CampaignMonthResponse entry,
            List<DistributionEntry> distributions
    ) {
    }

    public record DistributionEntry(
            Long distributionId,
            String publisherName,
            String label,
            DistributionStatus status,
            // Rate per payable event, pre-fills the payout
            BigDecimal rate,
            MonthEntryResponse entry
    ) {
    }
}
