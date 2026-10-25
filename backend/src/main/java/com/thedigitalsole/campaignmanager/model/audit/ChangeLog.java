package com.thedigitalsole.campaignmanager.model.audit;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * One change to money, with old and new values in the summary,
 * e.g. "Oct 2026 revenue 8500 → 8000". createdBy / createdAt say who and when.
 * campaign / distribution / partner ids are only for filtering the history.
 */
@Entity
@Table(
        name = "change_log",
        indexes = {
                @Index(name = "idx_change_log_campaign", columnList = "campaign_id"),
                @Index(name = "idx_change_log_distribution", columnList = "distribution_id"),
                @Index(name = "idx_change_log_partner", columnList = "partner_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class ChangeLog extends BaseEntity {

    // CAMPAIGN_MONTH, DISTRIBUTION_MONTH, PAYMENT, MONTH_CLOSE, EXCHANGE_RATE, CAMPAIGN, DISTRIBUTION
    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

    @Column(name = "campaign_id")
    private Long campaignId;

    @Column(name = "distribution_id")
    private Long distributionId;

    @Column(name = "partner_id")
    private Long partnerId;

    @Column(name = "period_month")
    private LocalDate month;

    // CREATE, UPDATE, DELETE
    @Column(nullable = false, length = 20)
    private String action;

    @Column(nullable = false, length = 1000)
    private String summary;
}
