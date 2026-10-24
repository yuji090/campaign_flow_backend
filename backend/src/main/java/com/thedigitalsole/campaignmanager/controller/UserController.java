package com.thedigitalsole.campaignmanager.controller;

import com.thedigitalsole.campaignmanager.dto.user.CreateUserRequest;
import com.thedigitalsole.campaignmanager.dto.user.UpdateUserRequest;
import com.thedigitalsole.campaignmanager.dto.user.UserResponse;
import com.thedigitalsole.campaignmanager.model.user.Role;
import com.thedigitalsole.campaignmanager.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }

    // GET /api/users?role=EMPLOYEE (used for employee dropdowns)
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public List<UserResponse> getUsers(@RequestParam(required = false) Role role) {
        return userService.getUsers(role);
    }

    // The logged-in user
    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public UserResponse getCurrentUser(Authentication authentication) {
        return userService.getUserByEmail(authentication.getName());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
    public UserResponse getUserById(@PathVariable Long id) {
        return userService.getUserById(id);
    }

    // Edit name/email/role, reset password, or disable login with enabled=false
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRequest request
    ) {
        return userService.updateUser(id, request);
    }
}
