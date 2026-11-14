import type { PoolClient } from "pg";
import razorpay from "./razorpay";
import { grantsAccess, planNameFromRazorpayId } from "./plans";
import {
    paymentEntitySchema,
    subscriptionEntitySchema,
    type PaidPlan,
    type PlanName,
    type SubscriptionEntity,
    type SubscriptionStatus,
} from "../models/billing.models";
import { insertPayment, listPaymentStatuses, syncSubscriptionFromWebhook } from "../db/billing.queries";

// What a Razorpay subscription entity means for our row. Pure, so it is unit-tested.
// Throws on an unknown plan id (webhook: rollback → Razorpay retries).
export const subscriptionUpdateFrom = (s: SubscriptionEntity) => {
    const paidPlan = planNameFromRazorpayId(s.plan_id);
    return {
        paidPlan,
        update: {
            rzpSubId: s.id,
            plan: (grantsAccess(s.status) ? paidPlan : "free") as PlanName,
            status: s.status as SubscriptionStatus,
            periodStart: s.current_start,
            periodEnd: s.current_end,
        },
    };
};

// Copy a subscription entity onto our row. Used by the webhook and by syncFromRazorpay,
// so both paths write exactly the same thing. Returns the row (null if we don't know this sub).
export const applySubscriptionEntity = async (s: SubscriptionEntity, client?: PoolClient) => {
    const { paidPlan, update } = subscriptionUpdateFrom(s);
    const row = await syncSubscriptionFromWebhook(update, client);
    return row ? { row, paidPlan } : null;
};

// Pull the subscription's current state straight from Razorpay and save it.
// Webhooks can't reach localhost and can arrive late in production, so the plan must not depend
// on them alone. Razorpay's API is the source of truth either way.
export const syncFromRazorpay = async (rzpSubId: string, paymentId?: string) => {
    const s = subscriptionEntitySchema.parse(await razorpay.subscriptions.fetch(rzpSubId));
    const applied = await applySubscriptionEntity(s);
    if (!applied) return null;

    // Payment history is a bonus here: never let it fail the plan sync.
    try {
        await backfillPayments(s.id, applied.row.user_id, applied.paidPlan, paymentId);
    } catch (error) {
        console.warn("billing: payment backfill failed", s.id, (error as Error).message);
    }
    return applied.row;
};

// Statuses that won't change again, so a stored payment in one of them needs no re-fetch
const FINAL_PAYMENT_STATUSES = ["captured", "failed", "refunded"];

// Payment ids from a subscription's invoices (Razorpay makes one invoice per charge).
// Pure, so it is unit-tested.
export const paymentIdsFromInvoices = (invoices: { payment_id?: string | null }[], extra?: string): string[] => {
    const ids = invoices.map((i) => i.payment_id).concat(extra);
    return [...new Set(ids.filter((id): id is string => !!id && /^pay_[A-Za-z0-9]+$/.test(id)))];
};

// Record every charge of this subscription that we haven't stored yet, straight from Razorpay.
// Covers payments made while webhooks couldn't reach us (localhost) or arrived late.
// knownPaymentId comes from a verified checkout signature, so it is trusted for this subscription.
export const backfillPayments = async (rzpSubId: string, userId: string, plan: PaidPlan, knownPaymentId?: string) => {
    const { items } = await razorpay.invoices.all({ subscription_id: rzpSubId, count: 100 } as any);
    const ids = paymentIdsFromInvoices(items, knownPaymentId);
    if (ids.length === 0) return;

    const stored = await listPaymentStatuses(ids);
    for (const id of ids) {
        if (FINAL_PAYMENT_STATUSES.includes(stored.get(id) ?? "")) continue;
        const raw = await razorpay.payments.fetch(id);
        const p = paymentEntitySchema.parse({ ...raw, amount: Number(raw.amount) });
        await insertPayment({
            userId,
            razorpayPaymentId: p.id,
            razorpaySubscriptionId: rzpSubId,
            plan,
            amount: p.amount,
            currency: p.currency,
            status: p.status,
        });
    }
};
