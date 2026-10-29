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
    content: string
) => {
    const { rows } = await pool.query(
        `INSERT INTO messages (conversation_id, role, content)
         SELECT id, $3, $4 FROM conversations
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [conversationId, userId, role, content]
    );
    return rows[0] ?? null;
};
