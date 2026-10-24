package com.thedigitalsole.campaignmanager.dto.distribution;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Getter
@Setter
public class MonthEntryResponse {

    private Long id;

    private Long distributionId;

    private YearMonth month;

    private long totalEvents;

    private long payableEvents;

    // totalEvents - payableEvents
    private long scrubbedEvents;

    private BigDecimal payout;

    private String currency;

    private String notes;

    private String updatedByName;

    private LocalDateTime updatedAt;
}
