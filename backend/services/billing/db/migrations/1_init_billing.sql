CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE subscriptions (
    id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                               UUID NOT NULL UNIQUE,
    plan                                  TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'builder')),
    status                                TEXT NOT NULL DEFAULT 'active',
    razorpay_subscription_id              TEXT UNIQUE NULL,
    razorpay_customer_id                  TEXT NULL,
    current_period_start                  TIMESTAMPTZ NULL,
    current_period_end                    TIMESTAMPTZ NULL,
    cancel_at_period_end                  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at                            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
    id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                               UUID NOT NULL,
    razorpay_payment_id                   TEXT UNIQUE NOT NULL,
    razorpay_subscription_id              TEXT,
    amount                                INTEGER NOT NULL, -- paise (₹999 = 99900)
    plan                                  TEXT NOT NULL CHECK (plan IN ('pro', 'builder')),
    currency                              TEXT NOT NULL DEFAULT 'INR',
    status                                TEXT NOT NULL,
    created_at                            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_user_id ON payments(user_id);

CREATE TABLE webhook_events (
    event_id                              TEXT PRIMARY KEY,
    event_type                            TEXT,
    payload                               JSONB,
    received_at                           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- one row per user per billing month
CREATE TABLE usage (
    user_id                               UUID NOT NULL,
    period_start                          DATE NOT NULL,
    prompts_used                          INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period_start)
);
