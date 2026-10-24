package com.thedigitalsole.campaignmanager.dto.distribution;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateDistributionRequest extends DistributionRequest {

    @NotNull
    private Long campaignId;
}
