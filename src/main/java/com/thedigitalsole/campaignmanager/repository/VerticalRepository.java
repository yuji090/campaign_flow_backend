package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.campaign.Vertical;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface VerticalRepository extends JpaRepository<Vertical, Long> {

    Optional<Vertical> findByNameIgnoreCase(String name);
}