import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../middlewares/billing.middlewares";
import { PLANS, effectivePlan, periodStart } from "../helpers/plans";
import { userIdSchema } from "../models/billing.models";
import { consumeUsage, getSubscriptionByUserId, refundUsage } from "../db/billing.queries";

// Internal routes are only reachable with x-internal-key (requireInternalKey) and are NOT proxied by the gateway.
// The agent service sends the user id in x-user-id.
const userIdFromHeader = (req: Request): string => {
    const parsed = userIdSchema.safeParse(req.header("x-user-id"));
    if (!parsed.success) throw new ApiError(400, "Missing or invalid x-user-id");
    return parsed.data;
};

// POST /internal/usage/consume: called by agent before running the graph.
// 200 → allowed (counted); 402 → over the monthly limit.
export const handleConsumeUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdFromHeader(req);
        const plan = effectivePlan(await getSubscriptionByUserId(userId));
        const limit = PLANS[plan].promptLimit;

        const used = await consumeUsage(userId, periodStart(), limit);
        if (used === null) {
            return res.status(402).json({ message: "Monthly prompt limit reached", plan, limit, upgrade: true });
        }

        res.json({ plan, used, limit, remaining: limit - used });
    } catch (error) {
        next(error);
    }
};

// POST /internal/usage/refund: agent calls this when a run it already counted failed or was cancelled.
export const handleRefundUsage = async (req: Request, res: Response, next: NextFunction) => {
    try {
        await refundUsage(userIdFromHeader(req), periodStart());
        res.status(204).end();
    } catch (error) {
        next(error);
    }
};
