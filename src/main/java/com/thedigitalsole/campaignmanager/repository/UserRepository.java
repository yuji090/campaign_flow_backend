package com.thedigitalsole.campaignmanager.repository;

import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.model.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByRole(Role role);

    long countByRoleAndEnabledTrueAndIdNot(Role role, Long id);
}
