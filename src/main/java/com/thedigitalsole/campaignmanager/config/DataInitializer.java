package com.thedigitalsole.campaignmanager.config;

import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {

        if (userRepository.findByEmail("admin@thedigitalsole.com").isEmpty()) {

            User admin = new User();
            admin.setName("admin");
            admin.setEmail("admin@thedigitalsole.com");

            admin.setPassword(
                    passwordEncoder.encode("admin")
            );

            admin.setRole(Role.ADMIN);
            admin.setEnabled(true);

            userRepository.save(admin);
        }
    }
}