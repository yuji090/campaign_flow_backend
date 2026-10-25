package com.thedigitalsole.campaignmanager.model.campaign;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Advertiser side of one campaign in one month: the revenue the advertiser pays us,
 * entered by hand, plus an optional signed adjustment. Amounts are in the campaign's currency.
 */
@Entity
@Table(
        name = "campaign_months",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_campaign_month",
                columnNames = {"campaign_id", "period_month"}
        ),
        indexes = @Index(name = "idx_campaign_month_period", columnList = "period_month")
)
@Getter
@Setter
@NoArgsConstructor
public class CampaignMonth extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    // Always the first day of the month
    @Column(name = "period_month", nullable = false)
    private LocalDate month;

    // Events the advertiser approved
    @Column(nullable = false)
    private long events;

    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal revenue = BigDecimal.ZERO;

    // Signed correction booked in this month, e.g. -800 for a clawback of last month's fraud
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal adjustment = BigDecimal.ZERO;

    @Column(length = 500)
    private String adjustmentNote;

    @Column(length = 1000)
    private String notes;

    // What counts in every report: revenue plus adjustment
    public BigDecimal netRevenue() {
        return revenue.add(adjustment);
    }
}
