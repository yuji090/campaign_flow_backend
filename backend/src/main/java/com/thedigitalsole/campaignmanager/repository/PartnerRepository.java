package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerRepository extends JpaRepository<Partner, Long> {

    // Throws 404 when the id does not exist
    default Partner getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> NotFoundException.of("Partner", id));
    }

    // Partners handled by this employee
    List<Partner> findDistinctByEmployeesId(Long userId);

    boolean existsByCompanyNameIgnoreCase(String companyName);

    boolean existsByCompanyNameIgnoreCaseAndIdNot(String companyName, Long id);
}
