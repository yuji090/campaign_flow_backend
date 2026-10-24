package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.campaign.Geo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GeoRepository extends JpaRepository<Geo, Long> {

    Optional<Geo> findByCodeIgnoreCase(String code);
}