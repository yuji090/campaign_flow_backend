package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.audit.ChangeLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChangeLogRepository extends JpaRepository<ChangeLog, Long> {

    List<ChangeLog> findByCampaignIdOrderByIdDesc(Long campaignId, Pageable pageable);

    List<ChangeLog> findByDistributionIdOrderByIdDesc(Long distributionId, Pageable pageable);

    List<ChangeLog> findByPartnerIdOrderByIdDesc(Long partnerId, Pageable pageable);

    List<ChangeLog> findAllByOrderByIdDesc(Pageable pageable);
}
