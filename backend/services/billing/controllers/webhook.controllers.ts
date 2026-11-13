import type { NextFunction, Request, Response } from "express";
import type { PoolClient } from "pg";
import pool from "../db/pool";
import { ApiError } from "../middlewares/billing.middlewares";
import { applySubscriptionEntity } from "../helpers/sync";
import { verifyWebhookSignature } from "../helpers/signature";
import { razorpayWebhookSchema, type RazorpayWebhook } from "../models/billing.models";
import { insertPayment, insertWebhookEvent } from "../db/billing.queries";

// POST /api/v1/billing/webhooks/razorpay
// Mounted with express.raw() so req.body is the exact bytes Razorpay signed.
// 2xx = processed (or safely ignored); 4xx/5xx = Razorpay retries.
export const handleRazorpayWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
        return next(new ApiError(400, "Expected raw body")); // route wired without express.raw()
    }
    if (!verifyWebhookSignature(rawBody, req.header("x-razorpay-signature"))) {
        return next(new ApiError(400, "Invalid webhook signature"));
    }
    const eventId = req.header("x-razorpay-event-id");
    if (!eventId) {
        return next(new ApiError(400, "Missing x-razorpay-event-id"));
    }

    let json: any;
    try {
        json = JSON.parse(rawBody.toString("utf8"));
    } catch {
        return next(new ApiError(400, "Invalid JSON"));
    }
    const parsed = razorpayWebhookSchema.safeParse(json);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const isNew = await insertWebhookEvent(eventId, String(json?.event ?? "unknown"), json, client);
        if (!isNew) {
            await client.query("COMMIT");
            return res.json({ status: "duplicate" });
        }

        if (!parsed.success) {
            // a shape we don't understand won't improve on retry: keep the raw event, log it, return 200
            console.warn("razorpay webhook: unexpected payload", eventId, parsed.error.issues);
        } else {
            await applyEvent(parsed.data, client);
        }

        await client.query("COMMIT");
        res.json({ status: "ok" });
    } catch (error) {
        // roll back the webhook_events row too, so Razorpay's retry is processed instead of seen as duplicate
        await client.query("ROLLBACK").catch(() => {});
        next(error);
    } finally {
        client.release();
    }
};

// Every subscription.* event carries the full subscription, so we copy its state over
// instead of handling each event type separately.
const applyEvent = async ({ event, payload }: RazorpayWebhook, client: PoolClient) => {
    if (!event.startsWith("subscription.") || !payload.subscription) return;

    const s = payload.subscription.entity;
    // throws on unknown plan id → rollback → retry
    const applied = await applySubscriptionEntity(s, client);
    if (!applied) {
        // an old/abandoned subscription the user replaced; nothing of ours to update
        console.warn("razorpay webhook: no row for subscription", s.id, event);
        return;
    }

    if (event === "subscription.charged" && payload.payment) {
        const p = payload.payment.entity;
        await insertPayment(
            {
                userId: applied.row.user_id,
                razorpayPaymentId: p.id,
                razorpaySubscriptionId: s.id,
                plan: applied.paidPlan,
                amount: p.amount,
                currency: p.currency,
                status: p.status,
            },
            client
        );
    }
};
