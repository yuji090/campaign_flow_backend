package com.thedigitalsole.campaignmanager.dto.period;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MonthCloseRequest {

    @Size(max = 500)
    private String notes;
}
