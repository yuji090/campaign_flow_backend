package com.thedigitalsole.campaignmanager.model;

import com.thedigitalsole.campaignmanager.exception.ConflictException;
import com.thedigitalsole.campaignmanager.model.user.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * Common columns for every table: id, who/when created and last changed, and a version.
 * The version stops two people from silently overwriting each other's edits:
 * an update sent with an old version is rejected with 409 Conflict.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter
@Setter
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Version
    @Column(nullable = false)
    private Long version;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @CreatedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_id", updatable = false)
    private User createdBy;

    @LastModifiedBy
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    /**
     * Rejects an update made from an outdated copy of this record.
     * expectedVersion is the version the client loaded; null skips the check.
     */
    public void checkVersion(Long expectedVersion, String what) {

        if (expectedVersion != null && !expectedVersion.equals(version)) {
            String who = updatedBy != null ? " by " + updatedBy.getName() : "";
            throw new ConflictException(
                    what + " was changed" + who + " after you opened it. Reload the page to see the latest version"
            );
        }
    }
}
