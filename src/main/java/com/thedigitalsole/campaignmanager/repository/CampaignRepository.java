package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.campaign.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {

    // Campaigns we took from this partner (as advertiser)
    List<Campaign> findByAdvertiserId(Long advertiserId);
}
