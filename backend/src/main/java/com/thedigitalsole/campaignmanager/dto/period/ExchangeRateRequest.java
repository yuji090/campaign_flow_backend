package com.thedigitalsole.campaignmanager.dto.period;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ExchangeRateRequest {

    // 1 unit of the currency = rate units of the base currency
    @NotNull
    @Positive
    private BigDecimal rate;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
