package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/** The user making the current request, used for "updated by" fields. */
@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;

    public User currentUser() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            return null;
        }

        return userRepository.findByEmail(authentication.getName()).orElse(null);
    }
}
