package com.thedigitalsole.campaignmanager.model.period;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One month's rate for one currency: 1 unit of currency = rate units of the base currency. */
@Entity
@Table(
        name = "exchange_rates",
        uniqueConstraints = @UniqueConstraint(name = "uk_exchange_rate", columnNames = {"period_month", "currency"})
)
@Getter
@Setter
@NoArgsConstructor
public class ExchangeRate extends BaseEntity {

    // Always the first day of the month
    @Column(name = "period_month", nullable = false)
    private LocalDate month;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal rate;
}
