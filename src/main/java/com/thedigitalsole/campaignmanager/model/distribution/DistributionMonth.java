package com.thedigitalsole.campaignmanager.model.distribution;

import com.thedigitalsole.campaignmanager.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Publisher side of one distribution in one month: events they sent,
 * events we pay for, and what we pay them. Amounts are in the distribution's currency.
 * Revenue is not here; it is entered per campaign in CampaignMonth.
 */
@Entity
@Table(
        name = "distribution_months",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_distribution_month",
                columnNames = {"distribution_id", "period_month"}
        ),
        indexes = @Index(name = "idx_distribution_month_period", columnList = "period_month")
)
@Getter
@Setter
@NoArgsConstructor
public class DistributionMonth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "distribution_id", nullable = false)
    private Distribution distribution;

    // Always the first day of the month
    @Column(name = "period_month", nullable = false)
    private LocalDate month;

    // Events the publisher sent
    @Column(nullable = false)
    private long totalEvents;

    // Events we pay for, after scrubbing fraud
    @Column(nullable = false)
    private long payableEvents;

    // What we pay the publisher this month
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal payout = BigDecimal.ZERO;

    @Column(length = 1000)
    private String notes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
