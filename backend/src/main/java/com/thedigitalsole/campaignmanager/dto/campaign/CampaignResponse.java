package com.thedigitalsole.campaignmanager.dto.campaign;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignStatus;
import com.thedigitalsole.campaignmanager.model.campaign.PricingModel;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class CampaignResponse {

    private Long id;

    private String name;

    private PricingModel pricingModel;

    private boolean direct;

    private Long advertiserId;

    private String advertiserName;

    private BigDecimal payout;

    private String currency;

    private CampaignStatus status;

    private Long managerId;

    private String managerName;

    private LocalDate startDate;

    private LocalDate endDate;

    private String notes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String updatedByName;

    private Long version;
}
