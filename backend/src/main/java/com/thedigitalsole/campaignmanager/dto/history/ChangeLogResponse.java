package com.thedigitalsole.campaignmanager.dto.history;

import java.time.LocalDateTime;
import java.time.YearMonth;

public record ChangeLogResponse(
        Long id,
        String entityType,
        String action,
        YearMonth month,
        String summary,
        String byName,
        LocalDateTime at
) {
}
