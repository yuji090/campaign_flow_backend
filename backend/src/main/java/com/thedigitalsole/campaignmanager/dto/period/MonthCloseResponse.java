package com.thedigitalsole.campaignmanager.dto.period;

import java.time.LocalDateTime;
import java.time.YearMonth;

public record MonthCloseResponse(
        YearMonth month,
        String notes,
        String closedByName,
        LocalDateTime closedAt
) {
}
