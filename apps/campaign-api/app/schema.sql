CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'archived')),
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
    ('analyst', 'Customer user who can view reporting and performance data'),
    ('viewer', 'Read-only customer user')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO companies (id, name, slug)
VALUES ('demo-company', 'Demo Company', 'demo-company')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    body TEXT NOT NULL,
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

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS company_id TEXT NOT NULL DEFAULT 'demo-company' REFERENCES companies(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_company_id ON messages(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_status ON messages(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_company_memberships_user_id ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_company_created ON audit_events(company_id, created_at DESC);
