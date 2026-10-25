package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.payment.PaymentRequest;
import com.thedigitalsole.campaignmanager.dto.payment.PaymentResponse;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.model.payment.Payment;
import com.thedigitalsole.campaignmanager.model.payment.PaymentDirection;
import com.thedigitalsole.campaignmanager.model.payment.PaymentKind;
import com.thedigitalsole.campaignmanager.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static com.thedigitalsole.campaignmanager.service.ChangeLogService.Diff;
import static com.thedigitalsole.campaignmanager.service.ChangeLogService.entry;

/**
 * Money received from advertisers and paid to publishers, plus write-offs.
 * A payment clears the partner's total balance in its currency (not a specific month).
 */
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PartnerService partnerService;
    private final ChangeLogService changeLogService;

    @Transactional(readOnly = true)
    public List<PaymentResponse> getPayments(Long partnerId, YearMonth from, YearMonth to) {

        List<Payment> payments = partnerId != null
                ? paymentRepository.findByPartnerIdOrderByDateDescIdDesc(partnerId)
                : paymentRepository.findAllInRange(
                        from != null ? from.atDay(1) : LocalDate.of(2000, 1, 1),
                        to != null ? to.atEndOfMonth() : LocalDate.of(9999, 12, 31));

        return payments.stream()
                .filter(p -> from == null || !p.getDate().isBefore(from.atDay(1)))
                .filter(p -> to == null || !p.getDate().isAfter(to.atEndOfMonth()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public PaymentResponse createPayment(PaymentRequest request) {

        Payment payment = new Payment();
        apply(payment, request);

        Payment saved = paymentRepository.save(payment);

        changeLogService.record(entry("PAYMENT", saved.getId(), "CREATE")
                .partner(saved.getPartner().getId())
                .summary(describe(saved, "Added ")));

        return toResponse(saved);
    }

    @Transactional
    public PaymentResponse updatePayment(Long id, PaymentRequest request) {

        Payment payment = paymentRepository.getOrThrow(id);
        payment.checkVersion(request.getVersion(), "This payment");

        String partnerBefore = payment.getPartner().getCompanyName();
        BigDecimal amountBefore = payment.getAmount();
        BigDecimal deductionBefore = payment.getDeduction();
        LocalDate dateBefore = payment.getDate();
        PaymentDirection directionBefore = payment.getDirection();
        PaymentKind kindBefore = payment.getKind();
        String currencyBefore = payment.getCurrency();

        apply(payment, request);

        Payment saved = paymentRepository.save(payment);

        String summary = new Diff()
                .change("partner", partnerBefore, saved.getPartner().getCompanyName())
                .change("direction", directionBefore, saved.getDirection())
                .change("kind", kindBefore, saved.getKind())
                .change("amount", amountBefore, saved.getAmount())
                .change("deduction", deductionBefore, saved.getDeduction())
                .change("currency", currencyBefore, saved.getCurrency())
                .change("date", dateBefore, saved.getDate())
                .join("Edited payment of " + saved.getDate() + ": ");

        changeLogService.record(entry("PAYMENT", saved.getId(), "UPDATE")
                .partner(saved.getPartner().getId())
                .summary(summary));

        return toResponse(saved);
    }

    @Transactional
    public void deletePayment(Long id) {

        Payment payment = paymentRepository.getOrThrow(id);

        changeLogService.record(entry("PAYMENT", payment.getId(), "DELETE")
                .partner(payment.getPartner().getId())
                .summary(describe(payment, "Deleted ")));

        paymentRepository.delete(payment);
    }

    // =========================
    // HELPERS
    // =========================

    private void apply(Payment payment, PaymentRequest request) {

        Partner partner = partnerService.findPartnerById(request.getPartnerId());
        PaymentKind kind = request.getKind() != null ? request.getKind() : PaymentKind.PAYMENT;
        BigDecimal deduction = request.getDeduction() != null ? request.getDeduction() : BigDecimal.ZERO;

        // Money comes in from advertisers and goes out to publishers
        if (request.getDirection() == PaymentDirection.RECEIVED && !partner.isAdvertiser()) {
            throw new IllegalArgumentException(partner.getCompanyName() + " is not an advertiser, so nothing is received from them");
        }

        if (request.getDirection() == PaymentDirection.PAID && !partner.isPublisher()) {
            throw new IllegalArgumentException(partner.getCompanyName() + " is not a publisher, so nothing is paid to them");
        }

        if (kind == PaymentKind.WRITE_OFF && deduction.signum() != 0) {
            throw new IllegalArgumentException("A write-off has no deduction; enter the full amount being written off");
        }

        if (request.getDate().isAfter(LocalDate.now().plusDays(1))) {
            throw new IllegalArgumentException("Payment date cannot be in the future");
        }

        payment.setPartner(partner);
        payment.setDirection(request.getDirection());
        payment.setKind(kind);
        payment.setAmount(request.getAmount());
        payment.setDeduction(deduction);
        payment.setCurrency(request.getCurrency().trim().toUpperCase());
        payment.setDate(request.getDate());
        payment.setReference(blankToNull(request.getReference()));
        payment.setNotes(blankToNull(request.getNotes()));
    }

    private String describe(Payment payment, String prefix) {

        String what = payment.getKind() == PaymentKind.WRITE_OFF
                ? "write-off"
                : payment.getDirection() == PaymentDirection.RECEIVED ? "received" : "paid";

        return new Diff()
                .value("amount", payment.getAmount())
                .value("deduction", payment.getDeduction())
                .join(prefix + what + " " + payment.getCurrency() + " on " + payment.getDate() + ": ");
    }

    private PaymentResponse toResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getPartner().getId(),
                payment.getPartner().getCompanyName(),
                payment.getDirection(),
                payment.getKind(),
                payment.getAmount(),
                payment.getDeduction(),
                payment.cleared(),
                payment.getCurrency(),
                payment.getDate(),
                payment.getReference(),
                payment.getNotes(),
                payment.getCreatedBy() != null ? payment.getCreatedBy().getName() : null,
                payment.getCreatedAt(),
                payment.getUpdatedBy() != null ? payment.getUpdatedBy().getName() : null,
                payment.getVersion()
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
