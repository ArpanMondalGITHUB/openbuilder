import { z } from "zod"

// ── Primitives ─────────────────────────────────────────────
export const PLAN_NAMES = ["free", "pro", "builder"] as const
export const paidPlanSchema = z.enum(["pro", "builder"])          // you can't "buy" free
export const userIdSchema = z.uuid("Invalid user id")

// Razorpay ids have fixed prefixes, so reject anything else before calling their API
export const razorpayPaymentIdSchema = z.string().regex(/^pay_[A-Za-z0-9]+$/, "Invalid payment id")
export const razorpaySubscriptionIdSchema = z.string().regex(/^sub_[A-Za-z0-9]+$/, "Invalid subscription id")
// HMAC-SHA256 hex digest = 64 hex chars
export const razorpaySignatureSchema = z.string().regex(/^[a-f0-9]{64}$/, "Invalid signature")

export const SUBSCRIPTION_STATUSES = [
    "created", "authenticated", "active", "pending", "halted",
    "cancelled", "completed", "expired", "paused",
] as const
export const PAYMENT_STATUSES = ["created", "authorized", "captured", "refunded", "failed"] as const

// ── User routes (body) ─────────────────────────────────────
// POST /subscription
export const createSubscriptionSchema = z.object({
    planId: paidPlanSchema,
})

// POST /subscription/verify  (field names are exactly what Razorpay Checkout's handler returns)
export const verifySubscriptionSchema = z.object({
    razorpay_payment_id: razorpayPaymentIdSchema,
    razorpay_subscription_id: razorpaySubscriptionIdSchema,
    razorpay_signature: razorpaySignatureSchema,
})

// ── Webhook payload (parse AFTER the signature check) ─────
// Only the fields the handler reads; zod strips the rest, and the full raw body is in webhook_events.payload
export const subscriptionEntitySchema = z.object({
    id: razorpaySubscriptionIdSchema,
    plan_id: z.string(),
    status: z.enum(SUBSCRIPTION_STATUSES),
    current_start: z.number().int().nullable(),   // unix seconds
    current_end: z.number().int().nullable(),
    notes: z.record(z.string(), z.string()).optional(),
})

export const paymentEntitySchema = z.object({
    id: razorpayPaymentIdSchema,
    amount: z.number().int().nonnegative(),       // paise
    currency: z.string(),
    status: z.enum(PAYMENT_STATUSES),
})

export const razorpayWebhookSchema = z.object({
    event: z.string(),                            // "subscription.charged", ...
    payload: z.object({
        subscription: z.object({ entity: subscriptionEntitySchema }).optional(),
        payment: z.object({ entity: paymentEntitySchema }).optional(),
    }),
})

// ── Types ──────────────────────────────────────────────────
export type PlanName = (typeof PLAN_NAMES)[number]
export type PaidPlan = z.infer<typeof paidPlanSchema>
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]
export type CreateSubscription = z.infer<typeof createSubscriptionSchema>
export type VerifySubscription = z.infer<typeof verifySubscriptionSchema>
export type RazorpayWebhook = z.infer<typeof razorpayWebhookSchema>
export type SubscriptionEntity = z.infer<typeof subscriptionEntitySchema>
export type PaymentEntity = z.infer<typeof paymentEntitySchema>
