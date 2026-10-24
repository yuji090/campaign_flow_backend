package com.thedigitalsole.campaignmanager.dto.partner;

import com.thedigitalsole.campaignmanager.model.partner.PartnerType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class CreatePartnerRequest {

    @NotBlank
    private String companyName;

    @NotNull
    private PartnerType type;

    private boolean advertiser;

    private boolean publisher;

    private String contactPerson;

    @Email
    private String email;

    private String phone;

    private String messenger;

    private String website;

    // Employees handling this partner
    private Set<Long> employeeIds;

    @Size(max = 1000)
    private String notes;
}
