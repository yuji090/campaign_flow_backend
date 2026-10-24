package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.distribution.DistributionMonth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DistributionMonthRepository
        extends JpaRepository<DistributionMonth, Long> {

    List<DistributionMonth> findByDistributionIdOrderByMonthAsc(Long distributionId);

    Optional<DistributionMonth> findByDistributionIdAndMonth(Long distributionId, LocalDate month);

    boolean existsByDistributionId(Long distributionId);

    boolean existsByDistributionCampaignId(Long campaignId);

    // Each query fetches the distribution and campaign too, so totals can be grouped without extra queries

    @Query("""
            select m from DistributionMonth m
            join fetch m.distribution d
            join fetch d.campaign c
            join fetch d.publisher
            where m.month between :from and :to
            """)
    List<DistributionMonth> findAllInRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            select m from DistributionMonth m
            join fetch m.distribution d
            join fetch d.campaign c
            where c.id = :campaignId
              and m.month between :from and :to
            """)
    List<DistributionMonth> findByCampaignInRange(
            @Param("campaignId") Long campaignId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            select m from DistributionMonth m
            join fetch m.distribution d
            join fetch d.campaign c
            where d.publisher.id = :publisherId
              and m.month between :from and :to
            """)
    List<DistributionMonth> findByPublisherInRange(
            @Param("publisherId") Long publisherId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
