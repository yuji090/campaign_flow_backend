-- Finance v2: adjustments, advertiser-approved events, payments, month close,
-- exchange rates and a change history for money.

-- =========================
-- ADJUSTMENTS AND APPROVED EVENTS
-- =========================

-- Adjustment is signed (e.g. -800 for a fraud clawback of last month) and adds to the month's revenue
ALTER TABLE campaign_months
    ADD COLUMN adjustment      DECIMAL(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN adjustment_note VARCHAR(500);

-- approved_events: how many of this publisher's events the advertiser approved (optional).
-- Used to split campaign revenue across publishers more accurately than payable events.
-- Adjustment is signed and adds to the month's payout.
ALTER TABLE distribution_months
    ADD COLUMN approved_events BIGINT,
    ADD COLUMN adjustment      DECIMAL(14,4) NOT NULL DEFAULT 0,
    ADD COLUMN adjustment_note VARCHAR(500);

-- A direct campaign has no advertiser partner; clear any left over from before this rule
UPDATE campaigns SET advertiser_id = NULL WHERE direct = 1;

-- =========================
-- PAYMENTS (money that actually moved, per partner)
-- =========================

-- direction: RECEIVED (from an advertiser) or PAID (to a publisher)
-- kind: PAYMENT (real money) or WRITE_OFF (amount forgiven, clears the balance without money)
-- deduction: tax withheld / bank or gateway fees. amount + deduction is what clears the balance.
CREATE TABLE payments (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    partner_id    BIGINT        NOT NULL,
    direction     VARCHAR(30)   NOT NULL,
    kind          VARCHAR(30)   NOT NULL,
    amount        DECIMAL(14,4) NOT NULL,
    deduction     DECIMAL(14,4) NOT NULL DEFAULT 0,
    currency      VARCHAR(3)    NOT NULL,
    payment_date  DATE          NOT NULL,
    reference     VARCHAR(255),
    notes         VARCHAR(1000),

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT fk_payments_partner FOREIGN KEY (partner_id) REFERENCES partners (id),
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE INDEX idx_payment_partner ON payments (partner_id);
CREATE INDEX idx_payment_date ON payments (payment_date);

-- =========================
-- MONTH CLOSE (a closed month's numbers cannot be edited until an admin reopens it)
-- =========================

CREATE TABLE month_closes (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    period_month  DATE          NOT NULL,
    notes         VARCHAR(500),

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_month_close UNIQUE (period_month),
    CONSTRAINT fk_month_closes_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_month_closes_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- =========================
-- EXCHANGE RATES (per month, to convert every currency into the base currency)
-- =========================

-- rate: 1 unit of currency = rate units of the base currency
CREATE TABLE exchange_rates (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    period_month  DATE          NOT NULL,
    currency      VARCHAR(3)    NOT NULL,
    rate          DECIMAL(18,8) NOT NULL,

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_exchange_rate UNIQUE (period_month, currency),
    CONSTRAINT fk_exchange_rates_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_exchange_rates_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- =========================
-- CHANGE HISTORY (every change to money, with old and new values)
-- =========================

CREATE TABLE change_log (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    entity_type   VARCHAR(40)   NOT NULL,
    entity_id     BIGINT        NOT NULL,
    campaign_id   BIGINT,
    distribution_id BIGINT,
    partner_id    BIGINT,
    period_month  DATE,
    action        VARCHAR(20)   NOT NULL,
    summary       VARCHAR(1000) NOT NULL,

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT fk_change_log_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_change_log_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE INDEX idx_change_log_campaign ON change_log (campaign_id);
CREATE INDEX idx_change_log_distribution ON change_log (distribution_id);
CREATE INDEX idx_change_log_partner ON change_log (partner_id);
