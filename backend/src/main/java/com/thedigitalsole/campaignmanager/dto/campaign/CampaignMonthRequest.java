package com.thedigitalsole.campaignmanager.dto.campaign;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class CampaignMonthRequest {

    // Events the advertiser approved (optional, defaults to 0)
    @PositiveOrZero
    private Long events;

    // What the advertiser pays us this month, in the campaign's currency
    @NotNull
    @PositiveOrZero
    private BigDecimal revenue;

    // Signed correction booked in this month, e.g. -800 for a clawback of last month's fraud
    private BigDecimal adjustment;

    // Required when the adjustment is not zero
    @Size(max = 500)
    private String adjustmentNote;

    @Size(max = 1000)
    private String notes;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
