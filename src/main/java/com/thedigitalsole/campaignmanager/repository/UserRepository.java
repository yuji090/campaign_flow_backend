package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.exception.NotFoundException;
import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Throws 404 when the id does not exist
    default User getOrThrow(Long id) {
        return findById(id).orElseThrow(() -> NotFoundException.of("User", id));
    }

    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    long countByRoleAndEnabledTrueAndIdNot(Role role, Long id);
}
