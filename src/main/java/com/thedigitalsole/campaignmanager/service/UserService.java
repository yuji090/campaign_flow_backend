package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.user.CreateUserRequest;
import com.thedigitalsole.campaignmanager.dto.user.UpdateUserRequest;
import com.thedigitalsole.campaignmanager.dto.user.UserResponse;
import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.model.user.User;
import com.thedigitalsole.campaignmanager.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse createUser(CreateUserRequest request) {

        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("User already exists with email: " + email);
        }

        User user = new User();

        user.setName(request.getName().trim());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());
        user.setEnabled(true);

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsers(Role role) {

        List<User> users = role != null
                ? userRepository.findByRole(role)
                : userRepository.findAll();

        return users.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(Long id) {
        return toResponse(findUserById(id));
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByEmail(String email) {

        return userRepository.findByEmail(email)
                .map(this::toResponse)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found with email: " + email)
                );
    }

    @Transactional
    public UserResponse updateUser(Long id, UpdateUserRequest request) {

        User user = findUserById(id);

        if (request.getName() != null) {
            user.setName(request.getName().trim());
        }

        if (request.getEmail() != null) {

            String email = request.getEmail().trim().toLowerCase();

            userRepository.findByEmail(email)
                    .filter(other -> !other.getId().equals(id))
                    .ifPresent(other -> {
                        throw new IllegalArgumentException("User already exists with email: " + email);
                    });

            user.setEmail(email);
        }

        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        if (request.getEnabled() != null) {
            user.setEnabled(request.getEnabled());
        }

        // Never leave the system without an admin who can log in
        if ((user.getRole() != Role.ADMIN || !user.isEnabled())
                && userRepository.countByRoleAndEnabledTrueAndIdNot(Role.ADMIN, id) == 0) {
            throw new IllegalArgumentException("At least one active admin is required");
        }

        return toResponse(userRepository.save(user));
    }

    private User findUserById(Long id) {

        return userRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found with id: " + id)
                );
    }

    private UserResponse toResponse(User user) {

        UserResponse response = new UserResponse();

        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setRole(user.getRole());
        response.setEnabled(user.isEnabled());
        response.setCreatedAt(user.getCreatedAt());

        return response;
    }
}
