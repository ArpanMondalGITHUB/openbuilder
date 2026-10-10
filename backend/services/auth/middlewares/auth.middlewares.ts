import type{ ZodType } from "zod";
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"
import {config} from "../config/auth.config"
import { rateLimit } from 'express-rate-limit';
import { redisGet, redisSet } from "../../../shared/redis/redis";
import { ACCESS_TOKEN_TTL_SECONDS } from "../helpers/auth.helpers";

export class ApiError extends Error{
    constructor(public statusCode:number,message:string){
        super(message);
    }
};

export const validate =
  (schema: ZodType, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }
    Object.assign(req[source], result.data); // keep trimmed/lowercased values
    next();
};

export const errorHandler = (
  err:unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  // pg unique-constraint violation → duplicate email race lost
  if (typeof err === "object" && err !== null && (err as any).code === "23505") {
    return res.status(409).json({ message: "Email already registered" });
  }
  console.error(err); // real logging: swap for pino when you need it
  return res.status(500).json({ message: "Internal server error" });
};

export const accessTokenBlockKey = (jti: string) => `auth:access-token:${jti}`;
export const accessTokenBlockTtl = (
  exp?: number,
  now = Math.floor(Date.now() / 1000)
) => Math.max((exp ?? now + ACCESS_TOKEN_TTL_SECONDS) - now, 1);

export const blockAccessToken = async (jti: string, exp?: number) => {
  await redisSet(accessTokenBlockKey(jti), "1", accessTokenBlockTtl(exp));
};

const isAccessTokenBlocked = async (jti: string) =>
  (await redisGet(accessTokenBlockKey(jti))) === "1";

export const requireAuth = async(req:Request,res:Response , next:NextFunction) => {
  const token = req.headers.authorization?.replace("Bearer ","");
  if(!token) return next(new ApiError(401,"Not authorized"));
  try {
    const payload = jwt.verify(token,config.jwtSecret) as {sub?:string; jti?: string; exp?: number};
    if (!payload.sub || !payload.jti || await isAccessTokenBlocked(payload.jti)) {
      throw new ApiError(401, "Invalid or expired token");
    }
    (req as any).userId = payload.sub;
    (req as any).accessTokenJti = payload.jti;
    (req as any).accessTokenExp = payload.exp;
    next();
  } catch (error) {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token"));
  }
};

// Configure the specific limiter for auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Strict limit for sign-in attempts
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({ 
      error: 'Too many sign-in attempts. Please try again in 15 minutes.' 
    });
  }
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many refresh attempts. Please try again in 15 minutes.'
    });
  }
});

// DO NOT TOUCH THIS I AM KEEPING IT FOR MY KNOWLEDGE 

// const store = new Map<string, { count: number; resetAt: number }>();

// export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
//   const ip = req.ip ?? "unknown";
//   const now = Date.now();
//   const window = 15 * 60 * 1000; // 15 min
//   const limit = 10;

//   let record = store.get(ip);

//   if (!record || now > record.resetAt) {
//     record = { count: 0, resetAt: now + window };
//   }

//   record.count++;
//   store.set(ip, record);

//   if (record.count > limit) {
//     return res.status(429).json({ message: "Too many requests" });
//   }

//   next();
// };
