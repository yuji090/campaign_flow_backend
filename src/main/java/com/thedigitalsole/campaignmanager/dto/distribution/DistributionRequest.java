package com.thedigitalsole.campaignmanager.dto.distribution;

import com.thedigitalsole.campaignmanager.model.distribution.DistributionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

// Full update (PUT). Currency always comes from the campaign.
@Getter
@Setter
public class DistributionRequest {

    @NotNull
    private Long publisherId;

    @Size(max = 255)
    private String label;

    private Long managerId;

    // Rate per payable event
    @PositiveOrZero
    private BigDecimal payout;

    private DistributionStatus status;

    private LocalDate startDate;

    private LocalDate endDate;

    @Size(max = 1000)
    private String notes;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
