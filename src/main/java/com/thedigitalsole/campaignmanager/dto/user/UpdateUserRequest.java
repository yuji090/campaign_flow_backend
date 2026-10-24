package com.thedigitalsole.campaignmanager.dto.user;

import com.thedigitalsole.campaignmanager.model.user.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRequest {

    private String name;

    @Email
    private String email;

    // Sets a new password when provided
    @Size(min = 6)
    private String password;

    private Role role;

    // false = user can no longer log in
    private Boolean enabled;
}
