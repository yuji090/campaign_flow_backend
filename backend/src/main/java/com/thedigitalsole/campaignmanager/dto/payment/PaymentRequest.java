package com.thedigitalsole.campaignmanager.dto.payment;

import com.thedigitalsole.campaignmanager.model.payment.PaymentDirection;
import com.thedigitalsole.campaignmanager.model.payment.PaymentKind;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
// Used for both create (POST) and full update (PUT)
public class PaymentRequest {

    @NotNull
    private Long partnerId;

    @NotNull
    private PaymentDirection direction;

    // Defaults to PAYMENT
    private PaymentKind kind;

    // Money that reached the bank, or the amount written off
    @NotNull
    @Positive
    private BigDecimal amount;

    // Tax withheld and bank or gateway fees (payments only)
    @PositiveOrZero
    private BigDecimal deduction;

    @NotBlank
    @Size(min = 3, max = 3)
    private String currency;

    @NotNull
    private LocalDate date;

    @Size(max = 255)
    private String reference;

    @Size(max = 1000)
    private String notes;

    // Version the client loaded; a mismatch means someone else saved in between (409)
    private Long version;
}
