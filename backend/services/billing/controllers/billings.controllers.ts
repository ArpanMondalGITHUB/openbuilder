import type { NextFunction, Request, Response } from "express";
import razorpay from "../helpers/razorpay";
import { config } from "../config/billing.config";
import { ApiError } from "../middlewares/billing.middlewares";
import { PLANS, effectivePlan, periodStart } from "../helpers/plans";
import { verifyCheckoutSignature } from "../helpers/signature";
import { backfillPayments, syncFromRazorpay } from "../helpers/sync";
import type { CreateSubscription, VerifySubscription } from "../models/billing.models";
import {
    getSubscriptionByRazorpayId,
    getSubscriptionByUserId,
    getUsage,
    listPaymentsByUser,
    setCancelAtPeriodEnd,
    upsertCreatedSubscription,
} from "../db/billing.queries";

const userIdOf = (req: Request): string => {
    const userId = (req as any).user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    return userId;
};

// GET /plans: public plan list. Never exposes Razorpay plan ids.
export const handleGetPlans = (_req: Request, res: Response) => {
    const plans = Object.entries(PLANS).map(([id, p]) => ({
        id,
        name: p.name,
        price: p.price,
        currency: "INR",
        promptLimit: p.promptLimit,
    }));
    res.json({ plans });
};

// Statuses where checkout may have finished but we haven't heard about it yet
const AWAITING_ACTIVATION = ["created", "authenticated"];

// Current plan + this month's usage, in the shape the frontend reads. No row means free.
const subscriptionView = async (userId: string, sub: any) => {
    const plan = effectivePlan(sub);
    const used = await getUsage(userId, periodStart());
    return {
        plan,
        status: sub?.status ?? "active",
        currentPeriodEnd: sub?.current_period_end ?? null,
        cancelAtPeriodEnd: sub?.cancel_at_period_end ?? false,
        usage: { used, limit: PLANS[plan].promptLimit },
    };
};

// GET /subscription: current plan + this month's usage.
// A row still waiting for activation is refreshed from Razorpay, so a missed or late webhook
// can't leave a paying user on Free. If Razorpay is unreachable we answer from our DB.
export const handleGetSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req);
        let sub = await getSubscriptionByUserId(userId);
        if (sub?.razorpay_subscription_id && AWAITING_ACTIVATION.includes(sub.status)) {
            try {
                sub = (await syncFromRazorpay(sub.razorpay_subscription_id)) ?? sub;
            } catch (error) {
                console.warn("billing: razorpay refresh failed", sub.razorpay_subscription_id, (error as Error).message);
            }
        }
        res.json(await subscriptionView(userId, sub));
    } catch (error) {
        next(error);
    }
};

// POST /subscription { planId }: create the subscription at Razorpay; the frontend opens Checkout with it.
// Does NOT upgrade the user; verify / the webhook do that once Razorpay says the subscription is active.
export const handleCreateSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req);
        const { planId } = req.body as CreateSubscription;

        const existing = await getSubscriptionByUserId(userId);
        if (effectivePlan(existing) !== "free") {
            throw new ApiError(409, "You already have an active subscription");
        }

        const rzpSub = await razorpay.subscriptions.create({
            plan_id: PLANS[planId].razorpayPlanId!,
            total_count: 12,          // 12 monthly charges, then it completes
            customer_notify: 1,
            notes: { userId },        // the webhook can trace the payment back to the user
        });

        await upsertCreatedSubscription({ userId, rzpSubId: rzpSub.id });

        res.status(201).json({ subscriptionId: rzpSub.id, keyId: config.razorpayKeyId });
    } catch (error) {
        next(error);
    }
};

// POST /subscription/verify: check the Checkout signature, then pull the subscription and payment
// from Razorpay and save them. Answers with the same body as GET /subscription.
// Safe to call again (the frontend polls it while Razorpay activates the subscription).
export const handleVerifySubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req);
        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = req.body as VerifySubscription;

        if (!verifyCheckoutSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
            throw new ApiError(400, "Invalid payment signature");
        }

        // the subscription must be this user's, not someone else's id pasted in
        const sub = await getSubscriptionByRazorpayId(razorpay_subscription_id);
        if (!sub || sub.user_id !== userId) {
            throw new ApiError(403, "Subscription does not belong to this user");
        }

        const synced = await syncFromRazorpay(razorpay_subscription_id, razorpay_payment_id);
        res.json(await subscriptionView(userId, synced ?? sub));
    } catch (error) {
        next(error);
    }
};

// POST /subscription/cancel: always at cycle end, so the user keeps what they paid for.
// The subscription.cancelled webhook later sets plan = free.
export const handleCancelSubscription = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req);
        const sub = await getSubscriptionByUserId(userId);

        if (!sub?.razorpay_subscription_id || effectivePlan(sub) === "free") {
            throw new ApiError(400, "No active subscription to cancel");
        }
        if (sub.cancel_at_period_end) {
            // already cancelled: answer the same way instead of calling Razorpay again
            return res.json({ cancelAtPeriodEnd: true, currentPeriodEnd: sub.current_period_end });
        }

        await razorpay.subscriptions.cancel(sub.razorpay_subscription_id, true);
        const updated = await setCancelAtPeriodEnd(userId);

        res.json({ cancelAtPeriodEnd: true, currentPeriodEnd: updated?.current_period_end ?? null });
    } catch (error) {
        next(error);
    }
};

// GET /payments: payment history (latest 50)
export const handleListPayments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = userIdOf(req);
        // Pull any charges we missed (no webhook on localhost, or a late one) before listing.
        // Best effort: if Razorpay is down we still show what we have.
        const sub = await getSubscriptionByUserId(userId);
        if (sub?.razorpay_subscription_id && sub.plan !== "free") {
            try {
                await backfillPayments(sub.razorpay_subscription_id, userId, sub.plan);
            } catch (error) {
                console.warn("billing: payment backfill failed", sub.razorpay_subscription_id, (error as Error).message);
            }
        }
        const payments = await listPaymentsByUser(userId);
        res.json({ payments });
    } catch (error) {
        next(error);
    }
};
