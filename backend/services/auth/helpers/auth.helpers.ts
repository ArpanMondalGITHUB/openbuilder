import type { Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/auth.config";
import { createRefreshToken } from "../db/auth.queries";

const REFRESH_DAYS = 30;
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export const issueTokens = async (userId: string, res: Response, rememberMe = true) => {
    try {
        const accessToken = jwt.sign({sub:userId},config.jwtSecret,{
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
            jwtid: crypto.randomUUID(),
        });

        const refreshToken = crypto.randomBytes(32).toString("hex");

        const days = rememberMe ? REFRESH_DAYS : 1;

        await createRefreshToken({
            token:refreshToken,
            userId,
            expiresAt: new Date(Date.now() + days * 86_400_000),
        });

        res.cookie("refreshToken",refreshToken,{
            httpOnly:true,
            secure:config.isProduction,
            sameSite:"lax",
            maxAge: rememberMe ? days * 86_400_000 : undefined,
            path: "/api/v1/auth",
        });

        return accessToken;
    } catch (error) {
        console.log(error);
    }

}
