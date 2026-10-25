package com.thedigitalsole.campaignmanager.model.payment;

import com.thedigitalsole.campaignmanager.model.BaseEntity;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Money that actually moved between us and a partner (or was written off).
 * Payments clear the partner's total balance in that currency, not a specific month.
 */
@Entity
@Table(
        name = "payments",
        indexes = {
                @Index(name = "idx_payment_partner", columnList = "partner_id"),
                @Index(name = "idx_payment_date", columnList = "payment_date")
        }
)
@Getter
@Setter
@NoArgsConstructor
public class Payment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partner_id", nullable = false)
    private Partner partner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentDirection direction;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentKind kind = PaymentKind.PAYMENT;

    // Money that reached the bank (or the amount written off)
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal amount;

    // Tax withheld and bank or gateway fees; amount + deduction clears the balance
    @Column(nullable = false, precision = 14, scale = 4)
    private BigDecimal deduction = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "payment_date", nullable = false)
    private LocalDate date;

    // Bank / invoice / transaction reference
    private String reference;

    @Column(length = 1000)
    private String notes;

    // What this payment takes off the partner's balance
    public BigDecimal cleared() {
        return amount.add(deduction);
    }
}
