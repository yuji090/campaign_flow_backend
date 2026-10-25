package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.period.MonthClose;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface MonthCloseRepository extends JpaRepository<MonthClose, Long> {

    Optional<MonthClose> findByMonth(LocalDate month);

    boolean existsByMonth(LocalDate month);

    List<MonthClose> findAllByOrderByMonthDesc();
}
