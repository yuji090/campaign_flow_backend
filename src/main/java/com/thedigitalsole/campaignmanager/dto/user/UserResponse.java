package com.thedigitalsole.campaignmanager.dto.user;

import com.thedigitalsole.campaignmanager.model.user.Role;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class UserResponse {

    private Long id;

    private String name;

    private String email;

    private Role role;

    private boolean enabled;

    private LocalDateTime createdAt;

    private Long version;
}
