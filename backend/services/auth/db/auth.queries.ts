import crypto from "crypto";
import pool from "./pool"

export interface User {
    id:               string
    name:             string
    email:            string
    passwordHash:     string
    createdAt:        Date
    updatedAt:         Date
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
const refreshTokenDigest = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createRefreshToken = async (data: {
  token: string;
  userId: string;
  expiresAt: Date;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO refresh_tokens (token, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [refreshTokenDigest(data.token), data.userId, data.expiresAt]
  );
};

export const findRefreshToken = async (token:string) :Promise<RefreshToken | null> => {
    const {rows} = await pool.query<RefreshToken>(
        `SELECT id,token,user_id AS "userId", expires_at AS "expiresAt", created_at AS "createdAt"
        FROM refresh_tokens WHERE token = $1 OR token = $2 LIMIT 1`,
        [refreshTokenDigest(token), token]
    );
    return rows[0] ?? null;
};

export const deleteRefreshToken = async (token:string) => {
    await pool.query(`DELETE FROM refresh_tokens WHERE token = $1 OR token = $2`,[refreshTokenDigest(token), token]);
}

