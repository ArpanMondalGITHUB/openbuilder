import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { config } from "../config/gateway.config"
import { redisGet } from "../../shared/redis/redis"

export class ApiError extends Error {
    constructor(public statusCode: number, message: string) {
        super(message)
    }
}

// Prefix kept in sync with services/auth/middlewares/auth.middlewares.ts
export const accessTokenBlockKey = (jti: string) => `auth:access-token:${jti}`

export const verifyAccessToken = async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace("Bearer ", "")
    if (!token) return next(new ApiError(401, "Not authorized"))
    try {
        const payload = jwt.verify(token, config.jwtSecret) as { sub?: string; jti?: string }
        if (!payload.sub || !payload.jti) throw new ApiError(401, "Invalid token")
        if ((await redisGet(accessTokenBlockKey(payload.jti))) === "1") {
            throw new ApiError(401, "Token revoked")
        }
        (req as any).user = { id: payload.sub, jti: payload.jti }
        next()
    } catch (e) {
        next(e instanceof ApiError ? e : new ApiError(401, "Invalid or expired token"))
    }
}

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({ message: err.message })
    }
    console.error(err)
    res.status(500).json({ message: "Internal server error" })
}