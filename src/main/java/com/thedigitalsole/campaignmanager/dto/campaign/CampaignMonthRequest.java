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

    @Size(max = 1000)
    private String notes;
}
