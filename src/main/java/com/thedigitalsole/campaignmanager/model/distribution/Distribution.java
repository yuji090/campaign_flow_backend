package com.thedigitalsole.campaignmanager.model.distribution;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A campaign given to a publisher partner. Money is not calculated here;
 * it is entered month by month in {@link DistributionMonth}.
 */
@Entity
@Table(
        name = "distributions",
        indexes = {
                @Index(name = "idx_distribution_campaign", columnList = "campaign_id"),
                @Index(name = "idx_distribution_publisher", columnList = "publisher_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Distribution extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "publisher_id", nullable = false)
    private Partner publisher;

    // Tells apart several distributions to the same publisher, e.g. "Adsterra - BR"
    private String label;

    // Employee managing this distribution
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private User manager;

    // Rate we pay per payable event; pre-fills the monthly payout
    @Column(precision = 12, scale = 4)
    private BigDecimal payout;

    // Always the campaign's currency, so campaign profit never mixes currencies
    @Column(length = 3)
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DistributionStatus status = DistributionStatus.ACTIVE;

    private LocalDate startDate;

    private LocalDate endDate;

    @Column(length = 1000)
    private String notes;
}
