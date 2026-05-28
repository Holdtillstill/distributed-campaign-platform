CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
    monthly_send_limit INTEGER,
    credit_balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    is_internal_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
    slug TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_memberships (
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_slug TEXT NOT NULL REFERENCES roles(slug),
    credit_limit INTEGER,
    credits_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, user_id)
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (slug, description)
VALUES
    ('internal_admin', 'Internal operator with cross-tenant administration access'),
    ('customer_admin', 'Customer administrator for company users and settings'),
    ('campaign_manager', 'Customer user who can create and schedule campaigns'),
    ('regional_manager', 'Customer regional marketing manager with an allocated budget'),
    ('analyst', 'Customer user who can view reporting and performance data'),
    ('viewer', 'Read-only customer user')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO companies (id, name, slug)
VALUES ('demo-company', 'Demo Company', 'demo-company')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS monthly_send_limit INTEGER;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS credit_balance INTEGER NOT NULL DEFAULT 0;

ALTER TABLE company_memberships
    ADD COLUMN IF NOT EXISTS credit_limit INTEGER;

ALTER TABLE company_memberships
    ADD COLUMN IF NOT EXISTS credits_used INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS company_access_codes (
    code TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    role_slug TEXT NOT NULL DEFAULT 'customer_admin' REFERENCES roles(slug),
    credit_limit INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

ALTER TABLE company_access_codes
    ADD COLUMN IF NOT EXISTS credit_limit INTEGER;

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'regular' CHECK (message_type IN ('regular', 'smart')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scheduled', 'sent', 'cancelled')),
    scheduled_at TIMESTAMPTZ,
    modeled_audience_count INTEGER NOT NULL DEFAULT 0 CHECK (modeled_audience_count >= 0),
    audience_mode TEXT NOT NULL DEFAULT 'actual' CHECK (audience_mode IN ('actual', 'projected_sample')),
    credit_cost INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'failed', 'retried', 'dead_lettered')),
    idempotency_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT;

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'regular'
    CHECK (message_type IN ('regular', 'smart'));

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS credit_cost INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'scheduled', 'sent', 'cancelled'));

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS modeled_audience_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS audience_mode TEXT NOT NULL DEFAULT 'actual';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'campaigns_modeled_audience_count_check'
    ) THEN
        ALTER TABLE campaigns
            ADD CONSTRAINT campaigns_modeled_audience_count_check
            CHECK (modeled_audience_count >= 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'campaigns_audience_mode_check'
    ) THEN
        ALTER TABLE campaigns
            ADD CONSTRAINT campaigns_audience_mode_check
            CHECK (audience_mode IN ('actual', 'projected_sample'));
    END IF;
END $$;

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS subscriber_lists (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    estimated_subscriber_count INTEGER NOT NULL DEFAULT 0 CHECK (estimated_subscriber_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, name)
);

ALTER TABLE subscriber_lists
    ADD COLUMN IF NOT EXISTS estimated_subscriber_count INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'subscriber_lists_estimated_subscriber_count_check'
    ) THEN
        ALTER TABLE subscriber_lists
            ADD CONSTRAINT subscriber_lists_estimated_subscriber_count_check
            CHECK (estimated_subscriber_count >= 0);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS subscribers (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    marketing_status TEXT NOT NULL DEFAULT 'pending_confirmation' CHECK (marketing_status IN ('imported', 'pending_confirmation', 'confirmed', 'opted_out')),
    consent_status TEXT NOT NULL DEFAULT 'none' CHECK (consent_status IN ('none', 'company_provided', 'double_opt_in_requested', 'double_opt_in_confirmed', 'opted_out')),
    source TEXT NOT NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, phone_number)
);

CREATE TABLE IF NOT EXISTS subscriber_list_memberships (
    subscriber_list_id TEXT NOT NULL REFERENCES subscriber_lists(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (subscriber_list_id, subscriber_id)
);

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS subscriber_id TEXT REFERENCES subscribers(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS consent_events (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('company_provided', 'double_opt_in_requested', 'double_opt_in_confirmed', 'opted_out')),
    source TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppression_list (
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (company_id, phone_number)
);

CREATE TABLE IF NOT EXISTS double_opt_in_tokens (
    token TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscriber_id TEXT NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_links (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    subscriber_id TEXT REFERENCES subscribers(id) ON DELETE SET NULL,
    media_asset_id TEXT REFERENCES media_assets(id) ON DELETE SET NULL,
    destination_url TEXT,
    click_count INTEGER NOT NULL DEFAULT 0,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS click_events (
    id TEXT PRIMARY KEY,
    campaign_link_id TEXT NOT NULL REFERENCES campaign_links(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS redemption_events (
    id TEXT PRIMARY KEY,
    campaign_link_id TEXT NOT NULL REFERENCES campaign_links(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminder_campaigns (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    source_campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    audience_rule TEXT NOT NULL CHECK (audience_rule IN ('not_clicked', 'clicked_not_redeemed')),
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
    estimated_recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscribers_company_phone ON subscribers(company_id, phone_number);
CREATE INDEX IF NOT EXISTS idx_subscribers_company_created ON subscribers(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_company_consent_status ON subscribers(company_id, consent_status);
CREATE INDEX IF NOT EXISTS idx_subscriber_list_memberships_subscriber_created ON subscriber_list_memberships(subscriber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriber_list_memberships_list_subscriber ON subscriber_list_memberships(subscriber_list_id, subscriber_id);
CREATE INDEX IF NOT EXISTS idx_consent_events_subscriber_created ON consent_events(subscriber_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_double_opt_in_tokens_subscriber ON double_opt_in_tokens(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_company_id ON media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_links_company_id ON campaign_links(company_id);
CREATE INDEX IF NOT EXISTS idx_campaign_links_campaign_id ON campaign_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_click_events_link_created ON click_events(campaign_link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemption_events_link_created ON redemption_events(campaign_link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reminder_campaigns_company_id ON reminder_campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_reminder_campaigns_source_campaign_id ON reminder_campaigns(source_campaign_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_scheduled ON campaigns(company_id, scheduled_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_status ON messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_company_created ON audit_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_access_codes_company_id ON company_access_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_company_access_codes_active ON company_access_codes(code) WHERE revoked_at IS NULL;
