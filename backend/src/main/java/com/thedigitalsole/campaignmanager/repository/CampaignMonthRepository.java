package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.campaign.CampaignMonth;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface CampaignMonthRepository
        extends JpaRepository<CampaignMonth, Long> {

    List<CampaignMonth> findByCampaignIdOrderByMonthAsc(Long campaignId);

    Optional<CampaignMonth> findByCampaignIdAndMonth(Long campaignId, LocalDate month);

    boolean existsByCampaignId(Long campaignId);

    @Query("select distinct m.campaign.id from CampaignMonth m")
    Set<Long> findCampaignIdsWithMonths();

    // Each query fetches the campaign too, so totals can be grouped without extra queries

    @Query("""
            select m from CampaignMonth m
            join fetch m.campaign c
            left join fetch c.advertiser
            where m.month between :from and :to
            """)
    List<CampaignMonth> findAllInRange(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            select m from CampaignMonth m
            join fetch m.campaign c
            where c.id = :campaignId
              and m.month between :from and :to
            """)
    List<CampaignMonth> findByCampaignInRange(
            @Param("campaignId") Long campaignId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );

    @Query("""
            select m from CampaignMonth m
            join fetch m.campaign c
            where c.advertiser.id = :advertiserId
              and m.month between :from and :to
            """)
    List<CampaignMonth> findByAdvertiserInRange(
            @Param("advertiserId") Long advertiserId,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to
    );
}
