package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.period.*;
import com.thedigitalsole.campaignmanager.exception.ConflictException;
import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.period.ExchangeRate;
import com.thedigitalsole.campaignmanager.model.period.MonthClose;
import com.thedigitalsole.campaignmanager.repository.ExchangeRateRepository;
import com.thedigitalsole.campaignmanager.repository.MonthCloseRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static com.thedigitalsole.campaignmanager.service.ChangeLogService.Diff;
import static com.thedigitalsole.campaignmanager.service.ChangeLogService.entry;
import static com.thedigitalsole.campaignmanager.service.ChangeLogService.monthLabel;

/**
 * Month-level settings: closing a month (locks its numbers) and exchange rates
 * used to convert every currency into the base currency for company totals.
 */
@Service
public class PeriodService {

    private final MonthCloseRepository monthCloseRepository;
    private final ExchangeRateRepository exchangeRateRepository;
    private final ChangeLogService changeLogService;
    private final String baseCurrency;

    public PeriodService(
            MonthCloseRepository monthCloseRepository,
            ExchangeRateRepository exchangeRateRepository,
            ChangeLogService changeLogService,
            @Value("${app.base-currency:USD}") String baseCurrency
    ) {
        this.monthCloseRepository = monthCloseRepository;
        this.exchangeRateRepository = exchangeRateRepository;
        this.changeLogService = changeLogService;
        this.baseCurrency = baseCurrency.trim().toUpperCase();
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    // =========================
    // MONTH CLOSE
    // =========================

    @Transactional(readOnly = true)
    public boolean isClosed(YearMonth month) {
        return monthCloseRepository.existsByMonth(month.atDay(1));
    }

    /** Throws 409 when the month is closed. Call before changing any of that month's numbers. */
    @Transactional(readOnly = true)
    public void assertOpen(YearMonth month) {

        if (isClosed(month)) {
            throw new ConflictException(
                    monthLabel(month) + " is closed, so its numbers cannot be changed. "
                            + "Ask an admin to reopen it, or book the difference as an adjustment in an open month"
            );
        }
    }

    /** For saving a month's numbers: the month must have started and must not be closed. */
    @Transactional(readOnly = true)
    public void assertEditable(YearMonth month) {

        if (month.isAfter(YearMonth.now())) {
            throw new IllegalArgumentException(
                    monthLabel(month) + " has not started yet. Numbers can be entered from the 1st of the month"
            );
        }

        assertOpen(month);
    }

    @Transactional(readOnly = true)
    public Set<YearMonth> getClosedMonthSet() {
        return monthCloseRepository.findAll().stream()
                .map(close -> YearMonth.from(close.getMonth()))
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public List<MonthCloseResponse> getClosedMonths() {
        return monthCloseRepository.findAllByOrderByMonthDesc().stream()
                .map(this::toCloseResponse)
                .toList();
    }

    @Transactional
    public MonthCloseResponse closeMonth(YearMonth month, MonthCloseRequest request) {

        if (month.isAfter(YearMonth.now())) {
            throw new IllegalArgumentException("A month can only be closed once it has started");
        }

        if (isClosed(month)) {
            throw new ConflictException(monthLabel(month) + " is already closed");
        }

        MonthClose close = new MonthClose();
        close.setMonth(month.atDay(1));
        close.setNotes(request != null ? blankToNull(request.getNotes()) : null);

        MonthClose saved = monthCloseRepository.save(close);

        changeLogService.record(entry("MONTH_CLOSE", saved.getId(), "CREATE")
                .month(saved.getMonth())
                .summary("Closed " + monthLabel(month) + (saved.getNotes() != null ? " (" + saved.getNotes() + ")" : "")));

        return toCloseResponse(saved);
    }

    @Transactional
    public void reopenMonth(YearMonth month) {

        MonthClose close = monthCloseRepository.findByMonth(month.atDay(1))
                .orElseThrow(() -> new NotFoundException(monthLabel(month) + " is not closed"));

        monthCloseRepository.delete(close);

        changeLogService.record(entry("MONTH_CLOSE", close.getId(), "DELETE")
                .month(close.getMonth())
                .summary("Reopened " + monthLabel(month)));
    }

    // =========================
    // EXCHANGE RATES
    // =========================

    @Transactional(readOnly = true)
    public List<ExchangeRateResponse> getRates(YearMonth from, YearMonth to) {

        LocalDate start = from != null ? from.atDay(1) : LocalDate.of(2000, 1, 1);
        LocalDate end = to != null ? to.atDay(1) : LocalDate.of(9999, 12, 1);

        return exchangeRateRepository.findByMonthBetweenOrderByMonthDescCurrencyAsc(start, end).stream()
                .map(this::toRateResponse)
                .toList();
    }

    @Transactional
    public ExchangeRateResponse saveRate(YearMonth month, String currency, ExchangeRateRequest request) {

        String code = normalizeCurrency(currency);

        if (code.equals(baseCurrency)) {
            throw new IllegalArgumentException(baseCurrency + " is the base currency, its rate is always 1");
        }

        assertOpen(month);

        LocalDate monthStart = month.atDay(1);

        ExchangeRate rate = exchangeRateRepository.findByMonthAndCurrency(monthStart, code)
                .orElseGet(() -> {
                    ExchangeRate created = new ExchangeRate();
                    created.setMonth(monthStart);
                    created.setCurrency(code);
                    return created;
                });

        boolean isNew = rate.getId() == null;
        BigDecimal before = rate.getRate();

        if (!isNew) {
            rate.checkVersion(request.getVersion(), monthLabel(month) + " " + code + " rate");
        }

        rate.setRate(request.getRate());

        ExchangeRate saved = exchangeRateRepository.save(rate);

        changeLogService.record(entry("EXCHANGE_RATE", saved.getId(), isNew ? "CREATE" : "UPDATE")
                .month(monthStart)
                .summary(new Diff().change(code + " → " + baseCurrency, before, request.getRate())
                        .join(monthLabel(month) + " rate: ")));

        return toRateResponse(saved);
    }

    @Transactional
    public void deleteRate(YearMonth month, String currency) {

        String code = normalizeCurrency(currency);

        ExchangeRate rate = exchangeRateRepository.findByMonthAndCurrency(month.atDay(1), code)
                .orElseThrow(() -> new NotFoundException("No " + code + " rate for " + monthLabel(month)));

        assertOpen(month);

        exchangeRateRepository.delete(rate);

        changeLogService.record(entry("EXCHANGE_RATE", rate.getId(), "DELETE")
                .month(rate.getMonth())
                .summary("Removed " + monthLabel(month) + " " + code + " rate " + rate.getRate().stripTrailingZeros().toPlainString()));
    }

    /**
     * Rates for converting into the base currency, keyed "2026-10|EUR".
     * The base currency itself is never in the map; use {@link #rate} to read it.
     */
    @Transactional(readOnly = true)
    public Map<String, BigDecimal> getRateMap(LocalDate from, LocalDate to) {

        Map<String, BigDecimal> rates = new HashMap<>();

        for (ExchangeRate rate : exchangeRateRepository.findByMonthBetweenOrderByMonthDescCurrencyAsc(from, to)) {
            rates.put(YearMonth.from(rate.getMonth()) + "|" + rate.getCurrency(), rate.getRate());
        }

        return rates;
    }

    // 1 for the base currency, the entered rate otherwise, null when missing
    public BigDecimal rate(Map<String, BigDecimal> rates, YearMonth month, String currency) {
        return baseCurrency.equals(currency) ? BigDecimal.ONE : rates.get(month + "|" + currency);
    }

    // =========================
    // HELPERS
    // =========================

    private MonthCloseResponse toCloseResponse(MonthClose close) {
        return new MonthCloseResponse(
                YearMonth.from(close.getMonth()),
                close.getNotes(),
                close.getCreatedBy() != null ? close.getCreatedBy().getName() : null,
                close.getCreatedAt()
        );
    }

    private ExchangeRateResponse toRateResponse(ExchangeRate rate) {
        return new ExchangeRateResponse(
                rate.getId(),
                YearMonth.from(rate.getMonth()),
                rate.getCurrency(),
                baseCurrency,
                rate.getRate(),
                rate.getUpdatedBy() != null ? rate.getUpdatedBy().getName() : null,
                rate.getUpdatedAt(),
                rate.getVersion()
        );
    }

    private String normalizeCurrency(String currency) {

        if (currency == null || currency.trim().length() != 3) {
            throw new IllegalArgumentException("Currency must be a 3-letter code like USD");
        }

        return currency.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
