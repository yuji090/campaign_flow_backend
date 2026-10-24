package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    // Throws 404 when the id does not exist
    default Campaign getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> NotFoundException.of("Campaign", id));
    }

    // Campaigns we took from this partner (as advertiser)
    List<Campaign> findByAdvertiserId(Long advertiserId);
}
