package com.thedigitalsole.campaignmanager.config;

import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.security.AppUserPrincipal;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

/** Fills createdBy/updatedBy on every save with the logged-in user. */
@Configuration
@EnableJpaAuditing(auditorAwareRef = "auditorAware")
public class JpaAuditingConfig {

    @Bean
    public AuditorAware<User> auditorAware(EntityManager entityManager) {

        return () -> {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

            if (authentication == null || !(authentication.getPrincipal() instanceof AppUserPrincipal principal)) {
                return Optional.empty();
            }

            // A reference, not a query: auditing runs during flush, where queries are unsafe
            return Optional.of(entityManager.getReference(User.class, principal.getId()));
        };
    }
}
