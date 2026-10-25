package com.thedigitalsole.campaignmanager.model.payment;

public enum PaymentKind {
    // Real money moved
    PAYMENT,
    // Balance forgiven without money moving, e.g. "let the last 2k go"
    WRITE_OFF
}
