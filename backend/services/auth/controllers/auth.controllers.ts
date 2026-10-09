import { ApiError } from "../middlewares/auth.middlewares";
import {
    findUserByEmail,
    createUser,
    findRefreshToken,
    deleteRefreshToken,
    findUserById,
} from "../db/auth.queries"
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request,Response } from "express";
import { issueTokens } from "../helpers/auth.helpers";
import { config } from "../config/auth.config";


export const signup = async (req:Request,res:Response) => {
    const { name, email, password } = req.body;

    const existingUser = await findUserByEmail(email);
    if(existingUser) throw new ApiError(409, "Email already registered");

    const hashPassword = await bcrypt.hash(password, 12);

    const user = await createUser({name, email, passwordHash: hashPassword});

    const accessToken = await issueTokens(user.id, res);

    res.status(201).json({ user, accessToken });
};

export const signin = async (req:Request,res:Response) => {
    const { email, password, rememberMe } = req.body;

    const user = await findUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new ApiError(401, "Invalid email or password");
    }

    const accessToken = await issueTokens(user.id, res, rememberMe ?? true);

    const { passwordHash: _, ...safeUser } = user;

    res.json({ user: safeUser, accessToken });
};

export const refresh = async (req:Request,res:Response) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        throw new ApiError(401, "No refresh token");
    }

    const stored = await findRefreshToken(token);

    if (!stored || stored.expiresAt < new Date()) {
        throw new ApiError(401, "Invalid or expired refresh token");
    }

    const accesstoken = jwt.sign({ sub:stored.userId },config.jwtSecret,{ expiresIn: "15m" });

    res.json({accesstoken});
};

export const logout = async (req:Request,res:Response) => {
    const token = req.cookies?.refreshToken
    
    if(token) await deleteRefreshToken(token);

    res.clearCookie("refreshToken", { path: "/api/v1/auth" });
    res.json({ message: "Logged out" });
};

export const getMe = async (req:Request, res:Response) => {
  const user = await findUserById((req as any).userId);
  if(!user) throw new ApiError(404, "User not found");

  const { passwordHash: _, ...safeUser } = user;

  res.json({ user: safeUser });
};