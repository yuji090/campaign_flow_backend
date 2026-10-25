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

    private Long approvedEvents;

    private BigDecimal payout;

    private BigDecimal adjustment;

    private String adjustmentNote;

    // payout + adjustment: what counts in reports
    private BigDecimal netPayout;

    // payableEvents x the distribution's rate; null when no rate is set
    private BigDecimal expectedPayout;

    // payout differs from expectedPayout by more than 1%
    private boolean payoutMismatch;

    // A closed month cannot be edited until an admin reopens it
    private boolean closed;

    private String currency;

    private String notes;

    private String updatedByName;

    private LocalDateTime updatedAt;

    private Long version;
}
