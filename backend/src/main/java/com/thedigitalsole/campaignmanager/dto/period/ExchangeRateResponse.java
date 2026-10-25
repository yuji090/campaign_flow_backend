package com.thedigitalsole.campaignmanager.dto.period;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;

public record ExchangeRateResponse(
        Long id,
        YearMonth month,
        String currency,
        String baseCurrency,
        BigDecimal rate,
        String updatedByName,
        LocalDateTime updatedAt,
        Long version
) {
}
