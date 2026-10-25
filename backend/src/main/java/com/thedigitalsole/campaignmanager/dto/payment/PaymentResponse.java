package com.thedigitalsole.campaignmanager.dto.payment;

import com.thedigitalsole.campaignmanager.model.payment.PaymentDirection;
import com.thedigitalsole.campaignmanager.model.payment.PaymentKind;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long id,
        Long partnerId,
        String partnerName,
        PaymentDirection direction,
        PaymentKind kind,
        BigDecimal amount,
        BigDecimal deduction,
        // amount + deduction: what this takes off the balance
        BigDecimal cleared,
        String currency,
        LocalDate date,
        String reference,
        String notes,
        String createdByName,
        LocalDateTime createdAt,
        String updatedByName,
        Long version
) {
}
