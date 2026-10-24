package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.partner.CreatePartnerRequest;
import com.thedigitalsole.campaignmanager.dto.partner.PartnerResponse;
import com.thedigitalsole.campaignmanager.dto.partner.UpdatePartnerRequest;
import com.thedigitalsole.campaignmanager.exception.ConflictException;
import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.partner.Partner;
import com.thedigitalsole.campaignmanager.model.partner.PartnerRole;
import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.PartnerRepository;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final UserRepository userRepository;

    // =========================
    // CREATE
    // =========================

    @Transactional
    public PartnerResponse createPartner(CreatePartnerRequest request) {

        String companyName = request.getCompanyName().trim();

        if (partnerRepository.existsByCompanyNameIgnoreCase(companyName)) {
            throw new ConflictException(
                    "A partner already exists with name: " + companyName
            );
        }

        Partner partner = new Partner();

        partner.setCompanyName(companyName);
        partner.setType(request.getType());
        partner.setAdvertiser(request.isAdvertiser());
        partner.setPublisher(request.isPublisher());

        partner.setContactPerson(blankToNull(request.getContactPerson()));
        partner.setEmail(blankToNull(request.getEmail()));
        partner.setPhone(blankToNull(request.getPhone()));
        partner.setMessenger(blankToNull(request.getMessenger()));
        partner.setWebsite(blankToNull(request.getWebsite()));
        partner.setNotes(blankToNull(request.getNotes()));

        if (request.getEmployeeIds() != null) {
            partner.setEmployees(findUsersByIds(request.getEmployeeIds()));
        }

        validateRoles(partner);

        return toResponse(partnerRepository.save(partner));
    }

    // =========================
    // READ
    // =========================

    @Transactional(readOnly = true)
    public List<PartnerResponse> getPartners(PartnerRole role, Long employeeId) {

        List<Partner> partners = employeeId != null
                ? partnerRepository.findDistinctByEmployeesId(employeeId)
                : partnerRepository.findAll();

        return partners.stream()
                .filter(partner -> role == null
                        || (role == PartnerRole.ADVERTISER && partner.isAdvertiser())
                        || (role == PartnerRole.PUBLISHER && partner.isPublisher()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PartnerResponse getPartnerById(Long id) {
        return toResponse(findPartnerById(id));
    }

    // =========================
    // PARTIAL UPDATE
    // =========================

    @Transactional
    public PartnerResponse updatePartner(Long id, UpdatePartnerRequest request) {

        Partner partner = findPartnerById(id);
        partner.checkVersion(request.getVersion(), "This partner");

        if (request.getCompanyName() != null) {

            String companyName = request.getCompanyName().trim();

            if (partnerRepository.existsByCompanyNameIgnoreCaseAndIdNot(companyName, id)) {
                throw new ConflictException(
                        "A partner already exists with name: " + companyName
                );
            }

            partner.setCompanyName(companyName);
        }

        if (request.getType() != null) {
            partner.setType(request.getType());
        }

        if (request.getAdvertiser() != null) {
            partner.setAdvertiser(request.getAdvertiser());
        }

        if (request.getPublisher() != null) {
            partner.setPublisher(request.getPublisher());
        }

        if (request.getContactPerson() != null) {
            partner.setContactPerson(blankToNull(request.getContactPerson()));
        }

        if (request.getEmail() != null) {
            partner.setEmail(blankToNull(request.getEmail()));
        }

        if (request.getPhone() != null) {
            partner.setPhone(blankToNull(request.getPhone()));
        }

        if (request.getMessenger() != null) {
            partner.setMessenger(blankToNull(request.getMessenger()));
        }

        if (request.getWebsite() != null) {
            partner.setWebsite(blankToNull(request.getWebsite()));
        }

        if (request.getNotes() != null) {
            partner.setNotes(blankToNull(request.getNotes()));
        }

        if (request.getEmployeeIds() != null) {
            partner.setEmployees(findUsersByIds(request.getEmployeeIds()));
        }

        if (request.getActive() != null) {
            partner.setActive(request.getActive());
        }

        validateRoles(partner);

        return toResponse(partnerRepository.save(partner));
    }

    // =========================
    // DEACTIVATE (soft delete)
    // =========================

    @Transactional
    public void deactivatePartner(Long id) {

        Partner partner = findPartnerById(id);

        partner.setActive(false);

        partnerRepository.save(partner);
    }

    // =========================
    // HELPERS
    // =========================

    public Partner findPartnerById(Long id) {
        return partnerRepository.getOrThrow(id);
    }

    private Set<User> findUsersByIds(Set<Long> ids) {

        List<User> users = userRepository.findAllById(ids);

        if (users.size() != ids.size()) {
            throw new NotFoundException("One or more employees were not found");
        }

        return new HashSet<>(users);
    }

    private void validateRoles(Partner partner) {

        if (!partner.isAdvertiser() && !partner.isPublisher()) {
            throw new IllegalArgumentException(
                    "Partner must be an advertiser, a publisher, or both"
            );
        }
    }

    private PartnerResponse toResponse(Partner partner) {

        PartnerResponse response = new PartnerResponse();

        response.setId(partner.getId());
        response.setCompanyName(partner.getCompanyName());
        response.setType(partner.getType());
        response.setAdvertiser(partner.isAdvertiser());
        response.setPublisher(partner.isPublisher());

        response.setContactPerson(partner.getContactPerson());
        response.setEmail(partner.getEmail());
        response.setPhone(partner.getPhone());
        response.setMessenger(partner.getMessenger());
        response.setWebsite(partner.getWebsite());

        response.setEmployees(
                partner.getEmployees()
                        .stream()
                        .map(user -> new PartnerResponse.EmployeeRef(user.getId(), user.getName()))
                        .sorted(Comparator.comparing(PartnerResponse.EmployeeRef::name, String.CASE_INSENSITIVE_ORDER))
                        .toList()
        );

        response.setNotes(partner.getNotes());
        response.setActive(partner.isActive());
        response.setCreatedAt(partner.getCreatedAt());
        response.setUpdatedAt(partner.getUpdatedAt());
        response.setUpdatedByName(partner.getUpdatedBy() != null ? partner.getUpdatedBy().getName() : null);
        response.setVersion(partner.getVersion());

        return response;
    }

    private String blankToNull(String value) {

        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
