package com.thedigitalsole.campaignmanager.model.period;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * A closed month: its revenue, payouts and exchange rates cannot be edited
 * until an admin reopens it. createdBy / createdAt say who closed it and when.
 */
@Entity
@Table(
        name = "month_closes",
        uniqueConstraints = @UniqueConstraint(name = "uk_month_close", columnNames = "period_month")
)
@Getter
@Setter
@NoArgsConstructor
public class MonthClose extends BaseEntity {

    // Always the first day of the month
    @Column(name = "period_month", nullable = false)
    private LocalDate month;

    @Column(length = 500)
    private String notes;
}
