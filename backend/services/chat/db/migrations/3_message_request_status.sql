ALTER TABLE messages ADD COLUMN request_id UUID;
ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'complete';

CREATE UNIQUE INDEX idx_messages_request_id
    ON messages (conversation_id,request_id)
    WHERE role = 'user' AND request_id IS NOT NULL;