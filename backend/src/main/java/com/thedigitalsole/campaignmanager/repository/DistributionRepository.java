package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.distribution.Distribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface DistributionRepository
        extends JpaRepository<Distribution, Long> {

    // Throws 404 when the id does not exist
    default Distribution getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> NotFoundException.of("Distribution", id));
    }

    List<Distribution> findByCampaignId(Long campaignId);

    List<Distribution> findByPublisherId(Long publisherId);

    List<Distribution> findByCampaignIdAndPublisherId(Long campaignId, Long publisherId);

    boolean existsByCampaignId(Long campaignId);

    // Every distribution with its publisher and campaign, for screens that list them all
    @Query("select d from Distribution d join fetch d.publisher join fetch d.campaign")
    List<Distribution> findAllWithPublisher();

    @Query("select distinct d.campaign.id from Distribution d")
    Set<Long> findCampaignIdsWithDistributions();
}
