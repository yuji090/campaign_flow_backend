package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.payment.PaymentRequest;
import com.thedigitalsole.campaignmanager.dto.payment.PaymentResponse;
import com.thedigitalsole.campaignmanager.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // GET /api/payments?partnerId=3&from=2026-01&to=2026-12 (all optional)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<PaymentResponse> getPayments(
            @RequestParam(required = false) Long partnerId,
            @RequestParam(required = false) YearMonth from,
            @RequestParam(required = false) YearMonth to
    ) {
        return paymentService.getPayments(partnerId, from, to);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PaymentResponse createPayment(@Valid @RequestBody PaymentRequest request) {
        return paymentService.createPayment(request);
    }

    // Full update: send every field, empty ones are cleared
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public PaymentResponse updatePayment(@PathVariable Long id, @Valid @RequestBody PaymentRequest request) {
        return paymentService.updatePayment(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
    }
}
