import type { Pool, PoolClient } from "pg";
import pool from "./pool"

// Every query takes an optional `db` as its last argument. Leave it out to use the pool;
// pass a PoolClient to run the query inside a transaction (the webhook does this).
type Db = Pool | PoolClient;

// Single source of truth for these lists: models/billing.models.ts
import type { PlanName, PaidPlan, SubscriptionStatus, PaymentStatus } from "../models/billing.models";

// ── subscriptions ────────────────────────────────────────────────

// Q1: the user's subscription row, or null (null means free)
export const getSubscriptionByUserId = async (userId: string, db: Db = pool) => {
    const { rows } = await db.query(
        `SELECT * FROM subscriptions WHERE user_id = $1`,
        [userId]
    );
    return rows[0] ?? null;
};

// Q2: find a row by Razorpay's sub_xxx id (ownership check in verify)
export const getSubscriptionByRazorpayId = async (rzpSubId: string, db: Db = pool) => {
    const { rows } = await db.query(
        `SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1`,
        [rzpSubId]
    );
    return rows[0] ?? null;
};

// Q3: remember the subscription just created at Razorpay. Leaves `plan` alone:
// only the webhook upgrades a user.
export const upsertCreatedSubscription = async (
    data: { userId: string; rzpSubId: string },
    db: Db = pool
) => {
    const { rows } = await db.query(
        `INSERT INTO subscriptions (user_id, status, razorpay_subscription_id)
         VALUES ($1, 'created', $2)
         ON CONFLICT (user_id) DO UPDATE
         SET status = 'created',
             razorpay_subscription_id = EXCLUDED.razorpay_subscription_id,
             cancel_at_period_end = false,
             updated_at = now()
         RETURNING *`,
        [data.userId, data.rzpSubId]
    );
    return rows[0];
};

// Q4: copy state from a subscription.* webhook entity.
// periodStart/periodEnd are Razorpay unix seconds; null keeps the old value.
// Returns null when no row has this sub id (stale/abandoned subscription).
export const syncSubscriptionFromWebhook = async (
    data: {
        rzpSubId: string;
        plan: PlanName;
        status: SubscriptionStatus;
        periodStart: number | null;
        periodEnd: number | null;
    },
    db: Db = pool
) => {
    const { rows } = await db.query(
        `UPDATE subscriptions
         SET plan = $2,
             status = $3,
             current_period_start = COALESCE(to_timestamp($4), current_period_start),
             current_period_end   = COALESCE(to_timestamp($5), current_period_end),
             cancel_at_period_end = CASE WHEN $3 IN ('cancelled', 'completed', 'halted', 'expired')
                                         THEN false ELSE cancel_at_period_end END,
             updated_at = now()
         WHERE razorpay_subscription_id = $1
         RETURNING *`,
        [data.rzpSubId, data.plan, data.status, data.periodStart, data.periodEnd]
    );
    return rows[0] ?? null;
};

// Q5: user asked to cancel; they keep the plan until the webhook says cancelled
export const setCancelAtPeriodEnd = async (userId: string, db: Db = pool) => {
    const { rows } = await db.query(
        `UPDATE subscriptions
         SET cancel_at_period_end = true, updated_at = now()
         WHERE user_id = $1
         RETURNING *`,
        [userId]
    );
    return rows[0] ?? null;
};

// ── payments ─────────────────────────────────────────────────────

// Q6: record a payment. The same payment id again only updates its status.
export const insertPayment = async (
    p: {
        userId: string;
        razorpayPaymentId: string;
        razorpaySubscriptionId: string | null;
        plan: PaidPlan;
        amount: number; // paise
        currency: string;
        status: PaymentStatus;
    },
    db: Db = pool
) => {
    const { rows } = await db.query(
        `INSERT INTO payments (user_id, razorpay_payment_id, razorpay_subscription_id, plan, amount, currency, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (razorpay_payment_id) DO UPDATE SET status = EXCLUDED.status
         RETURNING *`,
        [p.userId, p.razorpayPaymentId, p.razorpaySubscriptionId, p.plan, p.amount, p.currency, p.status]
    );
    return rows[0];
};

// Q6b: status of each payment id we already have (backfill skips the final ones)
export const listPaymentStatuses = async (paymentIds: string[], db: Db = pool): Promise<Map<string, string>> => {
    const { rows } = await db.query(
        `SELECT razorpay_payment_id, status FROM payments WHERE razorpay_payment_id = ANY($1)`,
        [paymentIds]
    );
    return new Map(rows.map((r) => [r.razorpay_payment_id, r.status]));
};

// Q7: payment history, newest first
export const listPaymentsByUser = async (userId: string, db: Db = pool) => {
    const { rows } = await db.query(
        `SELECT id, razorpay_payment_id, plan, amount, currency, status, created_at
         FROM payments
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId]
    );
    return rows;
};

// ── webhooks ─────────────────────────────────────────────────────

// Q8: true the first time this event id is seen, false for a Razorpay retry/duplicate
export const insertWebhookEvent = async (
    eventId: string,
    eventType: string,
    payload: unknown,
    db: Db = pool
): Promise<boolean> => {
    const { rows } = await db.query(
        `INSERT INTO webhook_events (event_id, event_type, payload)
         VALUES ($1, $2, $3)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [eventId, eventType, JSON.stringify(payload)]
    );
    return rows.length > 0;
};

// ── usage ────────────────────────────────────────────────────────
// periodStart is a 'YYYY-MM-01' date string for the current month

// Q9: prompts used this period (0 if no row yet)
export const getUsage = async (userId: string, periodStart: string, db: Db = pool): Promise<number> => {
    const { rows } = await db.query(
        `SELECT prompts_used FROM usage WHERE user_id = $1 AND period_start = $2`,
        [userId, periodStart]
    );
    return rows[0]?.prompts_used ?? 0;
};

// Q10: atomic check-and-increment. New count, or null when the user is at the limit.
export const consumeUsage = async (
    userId: string,
    periodStart: string,
    limit: number,
    db: Db = pool
): Promise<number | null> => {
    if (limit <= 0) return null;
    const { rows } = await db.query(
        `INSERT INTO usage (user_id, period_start, prompts_used)
         VALUES ($1, $2, 1)
         ON CONFLICT (user_id, period_start) DO UPDATE
         SET prompts_used = usage.prompts_used + 1
         WHERE usage.prompts_used < $3
         RETURNING prompts_used`,
        [userId, periodStart, limit]
    );
    return rows[0]?.prompts_used ?? null;
};

// Q11: give a prompt back when the agent run failed or was cancelled
export const refundUsage = async (userId: string, periodStart: string, db: Db = pool) => {
    await db.query(
        `UPDATE usage
         SET prompts_used = GREATEST(prompts_used - 1, 0)
         WHERE user_id = $1 AND period_start = $2`,
        [userId, periodStart]
    );
};
