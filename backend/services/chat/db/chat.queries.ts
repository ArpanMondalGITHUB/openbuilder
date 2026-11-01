import pool from "./chat.pool";

export const createConversation = async (userId:string, title:string) => {
    const { rows } = await pool.query(
    `INSERT INTO conversations (user_id, title)
     VALUES ($1, $2)
     RETURNING *`,
     [userId, title]
    );
    return rows[0];
};

export const listUserConversations = async (userId: string) => {
    const { rows } = await pool.query(
        `SELECT * FROM conversations
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
};

// Updates only if the conversation belongs to this user — returns null otherwise.
export const updateConversation = async (
    conversationId: string,
    userId: string,
    title: string
) => {
    const { rows } = await pool.query(
        `UPDATE conversations
         SET title = $3
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId, title]
    );
    return rows[0] ?? null;
};

// Join filters by owner, so a conversationId that isn't yours returns no rows.
export const listMessages = async (conversationId: string, userId: string) => {
    const { rows } = await pool.query(
        `SELECT m.* FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         WHERE m.conversation_id = $1 AND c.user_id = $2
         ORDER BY m.created_at ASC`,
        [conversationId, userId]
    );
    return rows;
};

// Inserts only if the conversation belongs to this user — returns null otherwise.
export const createMessage = async (
    conversationId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
    requestId:string,
    status: "pending" | "complete" | "failed" = "complete"
) => {
    const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, role, content, request_id, status)
         SELECT id, $3, $4, $5, $6 FROM conversations
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId, role, content, requestId, status]
    );
    return rows[0] ?? null;
};

export const findUserMessageByRequestId = async (
    conversationId: string,
    userId: string,
    requestId: string
) => {
    const { rows } = await pool.query(
        `SELECT m.* FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE m.conversation_id = $1 AND c.user_id = $2
          AND m.request_id = $3 AND m.role = 'user'
        LIMIT 1`,
        [conversationId, userId, requestId]
    );
    return rows[0] ?? null;
};

export const setAttemptStatus = async (
    conversationId: string,
    userId: string,
    requestId: string,
    status: "pending" | "complete" | "failed"
) => {
    const { rowCount } = await pool.query(
        `UPDATE messages m SET status = $4
        FROM conversations c
        WHERE m.conversation_id = c.id AND c.id = $1 AND c.user_id = $2
          AND m.request_id = $3 AND m.role = 'user'`,
          [conversationId, userId, requestId, status]
    );
    return rowCount ?? 0;
};