package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.distribution.Distribution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DistributionRepository
        extends JpaRepository<Distribution, Long> {

    List<Distribution> findByCampaignId(Long campaignId);

    List<Distribution> findByPublisherId(Long publisherId);

    List<Distribution> findByCampaignIdAndPublisherId(Long campaignId, Long publisherId);

    boolean existsByCampaignId(Long campaignId);
}
