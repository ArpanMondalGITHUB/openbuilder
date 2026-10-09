import pool from "./pool"

export interface User {
    id:               string
    name:             string
    email:            string
    passwordHash:     string
    createdAt:        Date
    updateAt:         Date
};

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

export const findUserByEmail = async(email:string) : Promise<User | null> => {
    const { rows } = await pool.query<User>(
        `SELECT
            id,
            name,
            email,
            password_hash AS "passwordHash",
            created_at AS "createdAt",
            updated_at AS "updatedAt"
         FROM users
         WHERE email = $1 LIMIT 1`,
        [email]
    );
    return rows[0] ?? null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const { rows } = await pool.query<User>(
    `SELECT
        id,
        name,
        email,
        password_hash AS "passwordHash",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
     FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
};

export const createUser = async (data:{
    name:         string
    email:        string
    passwordHash: string
}) : Promise<Pick<User, "id" | "name" | "email" | "createdAt">> => {
    const { rows } = await pool.query<Pick<User, "id" | "name" | "email" | "createdAt">>(
        `INSERT INTO users (name,email,password_hash)
        VALUES ($1,$2,$3)
        RETURNING id, name, email, created_at AS "createdAt"`,
        [data.name,data.email,data.passwordHash]
    );
    return rows[0]!;
};

// RefreshToken queries
export const createRefreshToken = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [data.token, data.userId, data.expiresAt]
  );
};

export const findRefreshToken = async (token:string) :Promise<RefreshToken | null> => {
    const {rows} = await pool.query(
        `SELECT * FROM refresh_tokens WHERE token = $1 LIMIT 1`,
        [token]
    );
    return rows[0] ?? null;
};

export const deleteRefreshToken = async (token:string) => {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1`,[token]);
}

