package com.thedigitalsole.campaignmanager.model.distribution;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

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
public class DistributionMonth extends BaseEntity {

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

    // Of this publisher's events, how many the advertiser approved (optional).
    // When every publisher in a month has it, revenue is split by it instead of payable events.
    private Long approvedEvents;

    // What we pay the publisher this month
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal payout = BigDecimal.ZERO;

    // Signed correction booked in this month, e.g. -300 for a fraud deduction on last month
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal adjustment = BigDecimal.ZERO;

    @Column(length = 500)
    private String adjustmentNote;

    @Column(length = 1000)
    private String notes;

    // What counts in every report: payout plus adjustment
    public BigDecimal netPayout() {
        return payout.add(adjustment);
    }
}
