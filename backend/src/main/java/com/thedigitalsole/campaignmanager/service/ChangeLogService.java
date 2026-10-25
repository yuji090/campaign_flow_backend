package com.thedigitalsole.campaignmanager.service;

import com.thedigitalsole.campaignmanager.dto.history.ChangeLogResponse;
import com.thedigitalsole.campaignmanager.model.audit.ChangeLog;
import com.thedigitalsole.campaignmanager.repository.ChangeLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

/**
 * Keeps the history of every money change. Callers describe what changed with {@link Diff};
 * nothing is written when nothing changed.
 */
@Service
@RequiredArgsConstructor
public class ChangeLogService {

    private static final int MAX_ROWS = 200;
    private static final DateTimeFormatter MONTH = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final ChangeLogRepository changeLogRepository;

    // Runs inside the caller's transaction, so a failed save leaves no history row behind
    public void record(Entry entry) {

        if (entry.summary == null || entry.summary.isBlank()) {
            return;
        }

        ChangeLog log = new ChangeLog();

        log.setEntityType(entry.entityType);
        log.setEntityId(entry.entityId);
        log.setCampaignId(entry.campaignId);
        log.setDistributionId(entry.distributionId);
        log.setPartnerId(entry.partnerId);
        log.setMonth(entry.month);
        log.setAction(entry.action);
        log.setSummary(entry.summary.length() > 1000 ? entry.summary.substring(0, 1000) : entry.summary);

        changeLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<ChangeLogResponse> getHistory(Long campaignId, Long distributionId, Long partnerId) {

        Pageable page = PageRequest.of(0, MAX_ROWS);

        List<ChangeLog> rows;

        if (distributionId != null) {
            rows = changeLogRepository.findByDistributionIdOrderByIdDesc(distributionId, page);
        } else if (campaignId != null) {
            rows = changeLogRepository.findByCampaignIdOrderByIdDesc(campaignId, page);
        } else if (partnerId != null) {
            rows = changeLogRepository.findByPartnerIdOrderByIdDesc(partnerId, page);
        } else {
            rows = changeLogRepository.findAllByOrderByIdDesc(page);
        }

        return rows.stream()
                .map(log -> new ChangeLogResponse(
                        log.getId(),
                        log.getEntityType(),
                        log.getAction(),
                        log.getMonth() != null ? YearMonth.from(log.getMonth()) : null,
                        log.getSummary(),
                        log.getCreatedBy() != null ? log.getCreatedBy().getName() : null,
                        log.getCreatedAt()
                ))
                .toList();
    }

    public static String monthLabel(YearMonth month) {
        return month.format(MONTH);
    }

    // =========================
    // BUILDERS
    // =========================

    public static Entry entry(String entityType, Long entityId, String action) {
        return new Entry(entityType, entityId, action);
    }

    public static final class Entry {

        private final String entityType;
        private final Long entityId;
        private final String action;
        private Long campaignId;
        private Long distributionId;
        private Long partnerId;
        private LocalDate month;
        private String summary;

        private Entry(String entityType, Long entityId, String action) {
            this.entityType = entityType;
            this.entityId = entityId;
            this.action = action;
        }

        public Entry campaign(Long id) {
            campaignId = id;
            return this;
        }

        public Entry distribution(Long id) {
            distributionId = id;
            return this;
        }

        public Entry partner(Long id) {
            partnerId = id;
            return this;
        }

        public Entry month(LocalDate value) {
            month = value;
            return this;
        }

        public Entry summary(String value) {
            summary = value;
            return this;
        }
    }

    /** Collects "field old → new" parts, skipping fields that did not change. */
    public static final class Diff {

        private final List<String> parts = new ArrayList<>();

        public Diff change(String field, Object before, Object after) {

            if (!same(before, after)) {
                parts.add(field + " " + text(before) + " → " + text(after));
            }

            return this;
        }

        // For creates and deletes: "field value"
        public Diff value(String field, Object value) {

            if (value != null && !(value instanceof BigDecimal number && number.signum() == 0)) {
                parts.add(field + " " + text(value));
            }

            return this;
        }

        public boolean isEmpty() {
            return parts.isEmpty();
        }

        public String join(String prefix) {
            return parts.isEmpty() ? null : prefix + String.join(", ", parts);
        }

        private static boolean same(Object a, Object b) {

            if (a instanceof BigDecimal x && b instanceof BigDecimal y) {
                return x.compareTo(y) == 0;
            }

            return Objects.equals(a, b);
        }

        private static String text(Object value) {

            if (value == null) {
                return "—";
            }

            if (value instanceof BigDecimal number) {
                return number.stripTrailingZeros().toPlainString();
            }

            return value.toString();
        }
    }
}
