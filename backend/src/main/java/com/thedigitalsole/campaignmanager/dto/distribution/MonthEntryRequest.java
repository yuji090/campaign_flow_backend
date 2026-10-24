package com.thedigitalsole.campaignmanager.dto.distribution;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class MonthEntryRequest {

    // Events the publisher sent
    @NotNull
    @PositiveOrZero
    private Long totalEvents;

    // Events we pay for, after scrubbing (cannot exceed total)
    @NotNull
    @PositiveOrZero
    private Long payableEvents;

    // What we pay the publisher this month, in the distribution's currency
    @NotNull
    @PositiveOrZero
    private BigDecimal payout;

    @Size(max = 1000)
    private String notes;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
