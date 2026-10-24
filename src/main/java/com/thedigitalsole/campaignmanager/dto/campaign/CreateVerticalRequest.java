package com.thedigitalsole.campaignmanager.dto.campaign;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateVerticalRequest {

    @NotBlank
    @Size(max = 100)
    private String name;
}
