-- Initial schema. Never edit this file once it has run anywhere:
-- every later change goes in a new file (V2__..., V3__...).
--
-- Every table has the BaseEntity columns: id, version (optimistic locking),
-- created_at / updated_at and created_by_id / updated_by_id (who made the change).
-- Enum values are stored as VARCHAR so new values need no schema change.

-- =========================
-- USERS
-- =========================

CREATE TABLE users (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(30)  NOT NULL,
    enabled       BIT          NOT NULL,

    version       BIGINT       NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    updated_at    DATETIME(6)  NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- =========================
-- PARTNERS (advertiser and/or publisher)
-- =========================

CREATE TABLE partners (
    id             BIGINT        NOT NULL AUTO_INCREMENT,
    company_name   VARCHAR(255)  NOT NULL,
    type           VARCHAR(30)   NOT NULL,
    advertiser     BIT           NOT NULL,
    publisher      BIT           NOT NULL,
    contact_person VARCHAR(255),
    email          VARCHAR(255),
    phone          VARCHAR(255),
    messenger      VARCHAR(255),
    website        VARCHAR(255),
    notes          VARCHAR(1000),
    active         BIT           NOT NULL,

    version        BIGINT        NOT NULL,
    created_at     DATETIME(6)   NOT NULL,
    updated_at     DATETIME(6)   NOT NULL,
    created_by_id  BIGINT,
    updated_by_id  BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_partners_company_name UNIQUE (company_name),
    CONSTRAINT fk_partners_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_partners_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- Employees handling each partner
CREATE TABLE partner_employees (
    partner_id BIGINT NOT NULL,
    user_id    BIGINT NOT NULL,

    PRIMARY KEY (partner_id, user_id),
    CONSTRAINT fk_partner_employees_partner FOREIGN KEY (partner_id) REFERENCES partners (id),
    CONSTRAINT fk_partner_employees_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- =========================
-- CAMPAIGNS
-- =========================

CREATE TABLE campaigns (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    name          VARCHAR(255)  NOT NULL,
    pricing_model VARCHAR(30)   NOT NULL,
    direct        BIT           NOT NULL,
    advertiser_id BIGINT,
    payout        DECIMAL(12,4),
    currency      VARCHAR(3),
    status        VARCHAR(30)   NOT NULL,
    manager_id    BIGINT,
    start_date    DATE,
    end_date      DATE,
    notes         TEXT,

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT fk_campaigns_advertiser FOREIGN KEY (advertiser_id) REFERENCES partners (id),
    CONSTRAINT fk_campaigns_manager FOREIGN KEY (manager_id) REFERENCES users (id),
    CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_campaigns_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

-- Advertiser side: revenue entered per campaign per month
CREATE TABLE campaign_months (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    campaign_id   BIGINT        NOT NULL,
    period_month  DATE          NOT NULL,
    events        BIGINT        NOT NULL,
    revenue       DECIMAL(14,4) NOT NULL,
    notes         VARCHAR(1000),

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_campaign_month UNIQUE (campaign_id, period_month),
    CONSTRAINT fk_campaign_months_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
    CONSTRAINT fk_campaign_months_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_campaign_months_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE INDEX idx_campaign_month_period ON campaign_months (period_month);

-- =========================
-- DISTRIBUTIONS
-- =========================

CREATE TABLE distributions (
    id            BIGINT        NOT NULL AUTO_INCREMENT,
    campaign_id   BIGINT        NOT NULL,
    publisher_id  BIGINT        NOT NULL,
    label         VARCHAR(255),
    manager_id    BIGINT,
    payout        DECIMAL(12,4),
    currency      VARCHAR(3),
    status        VARCHAR(30)   NOT NULL,
    start_date    DATE,
    end_date      DATE,
    notes         VARCHAR(1000),

    version       BIGINT        NOT NULL,
    created_at    DATETIME(6)   NOT NULL,
    updated_at    DATETIME(6)   NOT NULL,
    created_by_id BIGINT,
    updated_by_id BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT fk_distributions_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
    CONSTRAINT fk_distributions_publisher FOREIGN KEY (publisher_id) REFERENCES partners (id),
    CONSTRAINT fk_distributions_manager FOREIGN KEY (manager_id) REFERENCES users (id),
    CONSTRAINT fk_distributions_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_distributions_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE INDEX idx_distribution_campaign ON distributions (campaign_id);
CREATE INDEX idx_distribution_publisher ON distributions (publisher_id);

-- Publisher side: events and payout per distribution per month
CREATE TABLE distribution_months (
    id              BIGINT        NOT NULL AUTO_INCREMENT,
    distribution_id BIGINT        NOT NULL,
    period_month    DATE          NOT NULL,
    total_events    BIGINT        NOT NULL,
    payable_events  BIGINT        NOT NULL,
    payout          DECIMAL(14,4) NOT NULL,
    notes           VARCHAR(1000),

    version         BIGINT        NOT NULL,
    created_at      DATETIME(6)   NOT NULL,
    updated_at      DATETIME(6)   NOT NULL,
    created_by_id   BIGINT,
    updated_by_id   BIGINT,

    PRIMARY KEY (id),
    CONSTRAINT uk_distribution_month UNIQUE (distribution_id, period_month),
    CONSTRAINT fk_distribution_months_distribution FOREIGN KEY (distribution_id) REFERENCES distributions (id),
    CONSTRAINT fk_distribution_months_created_by FOREIGN KEY (created_by_id) REFERENCES users (id),
    CONSTRAINT fk_distribution_months_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE INDEX idx_distribution_month_period ON distribution_months (period_month);
