package com.thedigitalsole.campaignmanager.dto.campaign;

import com.thedigitalsole.campaignmanager.model.campaign.GeoType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateGeoRequest {

    @NotBlank
    @Size(max = 10)
    private String code;

    @NotBlank
    @Size(max = 100)
    private String name;

    @NotNull
    private GeoType type;

    @Size(max = 100)
    private String region;
}
