package com.thedigitalsole.campaignmanager.model.campaign;

import com.thedigitalsole.campaignmanager.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Advertiser side of one campaign in one month: the revenue the advertiser pays us,
 * entered by hand. Amounts are in the campaign's currency.
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
public class CampaignMonth {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
