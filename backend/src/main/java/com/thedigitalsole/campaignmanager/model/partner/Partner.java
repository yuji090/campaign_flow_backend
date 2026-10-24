package com.thedigitalsole.campaignmanager.model.partner;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import com.thedigitalsole.campaignmanager.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * A company we work with. The same partner can act as an advertiser
 * (we take campaigns from them), a publisher (we give campaigns to them), or both.
 */
@Entity
@Table(name = "partners")
@Getter
@Setter
@NoArgsConstructor
public class Partner extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String companyName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PartnerType type;

    // Roles
    @Column(nullable = false)
    private boolean advertiser;

    @Column(nullable = false)
    private boolean publisher;

    // Contact
    private String contactPerson;

    private String email;

    private String phone;

    private String messenger; // Skype / Telegram / WhatsApp handle

    private String website;

    // Internal: employees handling this partner
    @ManyToMany
    @JoinTable(
            name = "partner_employees",
            joinColumns = @JoinColumn(name = "partner_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> employees = new HashSet<>();

    @Column(length = 1000)
    private String notes;

    @Column(nullable = false)
    private boolean active = true;
}
