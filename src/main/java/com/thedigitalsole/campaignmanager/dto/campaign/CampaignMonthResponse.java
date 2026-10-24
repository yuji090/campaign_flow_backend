package com.thedigitalsole.campaignmanager.dto.campaign;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Getter
@Setter
public class CampaignMonthResponse {

    private Long id;

    private Long campaignId;

    private YearMonth month;

    private long events;

    private BigDecimal revenue;

    private String currency;

    private String notes;

    private String updatedByName;

    private LocalDateTime updatedAt;

    private Long version;
}
