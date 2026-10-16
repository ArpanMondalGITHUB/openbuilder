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

