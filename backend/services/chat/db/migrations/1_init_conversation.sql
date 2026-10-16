
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE conversations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    agent_id     UUID NOT NULL,
    title        TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversations_user_id  ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
