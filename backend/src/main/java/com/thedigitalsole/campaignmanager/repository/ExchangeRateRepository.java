package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.period.ExchangeRate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRate, Long> {

    Optional<ExchangeRate> findByMonthAndCurrency(LocalDate month, String currency);

    List<ExchangeRate> findByMonthBetweenOrderByMonthDescCurrencyAsc(LocalDate from, LocalDate to);
}
