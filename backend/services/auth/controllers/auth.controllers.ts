import { ApiError, blockAccessToken } from "../middlewares/auth.middlewares";
import {
    findUserByEmail,
    createUser,
    findRefreshToken,
    deleteRefreshToken,
    findUserById,
} from "../db/auth.queries"
import bcrypt from "bcrypt";
import { 
    NextFunction,
    Request, 
    Response 
} from "express";
import { 
    ACCESS_TOKEN_TTL_SECONDS, 
    issueTokens 
} from "../helpers/auth.helpers";
import { 
    redisDel, 
    redisGet, 
    redisSet 
} from "../../../shared/redis/redis";

const userCacheKey = (userId: string) => `auth:user:${userId}`;

const cacheUser = async (userId: string, user: object) => {
    await redisSet(userCacheKey(userId), JSON.stringify(user), ACCESS_TOKEN_TTL_SECONDS);
};

const getCachedUser = async (userId: string): Promise<unknown | null> => {
    const cachedUser = await redisGet(userCacheKey(userId));
    if (!cachedUser) return null;
    try {
        return JSON.parse(cachedUser);
    } catch {
        await redisDel(userCacheKey(userId));
        return null;
    }
};

export const signup = async (req:Request,res:Response,next:NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await findUserByEmail(email);
        if(existingUser) throw new ApiError(409, "Email already registered");

        const hashPassword = await bcrypt.hash(password, 12);

        const user = await createUser({name, email, passwordHash: hashPassword});

        const accessToken = await issueTokens(user.id, res);

        res.status(201).json({ user, accessToken });
    } catch (error) {
        next(error);
    }
};

export const signin = async (req:Request,res:Response,next:NextFunction) => {
    try {
        const { email, password, rememberMe } = req.body;

        const user = await findUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new ApiError(401, "Invalid email or password");
        }

        const accessToken = await issueTokens(user.id, res, rememberMe ?? true);

        const { passwordHash: _, ...safeUser } = user;
        await cacheUser(user.id, safeUser);

        res.json({ user: safeUser, accessToken });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req:Request,res:Response,next:NextFunction) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            throw new ApiError(401, "No refresh token");
        }

        const stored = await findRefreshToken(token);

        if (!stored || stored.expiresAt < new Date()) {
            throw new ApiError(401, "Invalid or expired refresh token");
        }

        await deleteRefreshToken(token);

        const accessToken = await issueTokens(stored.userId, res);

        res.json({ accessToken });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req:Request,res:Response,next:NextFunction) => {
    try {
        const token = req.cookies?.refreshToken
        const userId = (req as any).userId;
        const accessTokenJti = (req as any).accessTokenJti;
        const accessTokenExp = (req as any).accessTokenExp;

        if (accessTokenJti) await blockAccessToken(accessTokenJti, accessTokenExp);
        if (userId) await redisDel(userCacheKey(userId));
        if(token) await deleteRefreshToken(token);

        res.clearCookie("refreshToken", { path: "/api/v1/auth" });
        res.json({ message: "Logged out" });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req:Request, res:Response,next:NextFunction) => {
    try {
        const userId = (req as any).userId;
        const cachedUser = await getCachedUser(userId);
        if (cachedUser) {
            return res.json({ user: cachedUser });
        }

        const user = await findUserById(userId);
        if(!user) throw new ApiError(404, "User not found");

        const { passwordHash: _, ...safeUser } = user;
        await cacheUser(user.id, safeUser);

        res.json({ user: safeUser });
    } catch (error) {
        next(error);
    }
};
