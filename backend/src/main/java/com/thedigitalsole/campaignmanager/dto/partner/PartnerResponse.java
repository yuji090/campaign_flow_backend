package com.thedigitalsole.campaignmanager.dto.partner;

import com.thedigitalsole.campaignmanager.model.partner.PartnerType;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
public class PartnerResponse {

    private Long id;

    private String companyName;

    private PartnerType type;

    private boolean advertiser;

    private boolean publisher;

    private String contactPerson;

    private String email;

    private String phone;

    private String messenger;

    private String website;

    private List<EmployeeRef> employees;

    private String notes;

    private boolean active;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    private String updatedByName;

    private Long version;

    public record EmployeeRef(Long id, String name) {
    }
}
