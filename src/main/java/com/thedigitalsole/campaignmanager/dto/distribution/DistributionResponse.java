package com.thedigitalsole.campaignmanager.dto.distribution;

import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
public class DistributionResponse {

    private Long id;

    private Long campaignId;

    private String campaignName;

    private Long publisherId;

    private String publisherName;

    private String label;

    private Long managerId;

    private String managerName;

    private BigDecimal payout;

    private String currency;

    private DistributionStatus status;

    private LocalDate startDate;

    private LocalDate endDate;

    private String notes;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String updatedByName;

    private Long version;
}
