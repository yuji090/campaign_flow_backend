package com.thedigitalsole.campaignmanager.dto.campaign;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.campaign.PricingModel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
// Used for both create (POST) and full update (PUT)
public class CampaignRequest {

    @NotBlank
    private String name;

    @NotNull
    private PricingModel pricingModel;

    private boolean direct;

    // Required when the campaign is not direct
    private Long advertiserId;

    @PositiveOrZero
    private BigDecimal payout;

    @Size(min = 3, max = 3)
    private String currency;

    @NotNull
    private CampaignStatus status;

    private Long managerId;

    private LocalDate startDate;

    private LocalDate endDate;

    private String notes;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
