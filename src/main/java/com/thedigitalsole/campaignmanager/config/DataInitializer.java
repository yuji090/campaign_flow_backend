package com.thedigitalsole.campaignmanager.config;

import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * Creates the first admin when the users table is empty, so a fresh database can be logged into.
 * Credentials come from app.bootstrap.admin-*; without a password a random one is generated and logged once.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap.admin-name}")
    private String adminName;

    @Value("${app.bootstrap.admin-email}")
    private String adminEmail;

    @Value("${app.bootstrap.admin-password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {

        if (userRepository.count() > 0) {
            return;
        }

        String password = adminPassword;

        if (password == null || password.isBlank()) {
            byte[] bytes = new byte[12];
            new SecureRandom().nextBytes(bytes);
            password = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            log.warn("No ADMIN_PASSWORD set. Created admin {} with generated password: {} (change it after logging in)",
                    adminEmail, password);
        }

        User admin = new User();
        admin.setName(adminName);
        admin.setEmail(adminEmail.trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(password));
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);

        userRepository.save(admin);

        log.info("Created first admin user {}", adminEmail);
    }
}
