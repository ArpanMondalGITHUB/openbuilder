import { config } from "../config/billing.config";
import type { PaidPlan, PlanName, SubscriptionStatus } from "../models/billing.models";

type PlanInfo = {
    name: string;
    price: number;          // paise per month, display only (Razorpay's plan is what actually charges)
    promptLimit: number;    // prompts per calendar month
    razorpayPlanId: string | null;
};

// TODO(you): set the Builder price/limit to match the plan you created in the Razorpay dashboard,
// and adjust the prompt limits to what you want to sell.
export const PLANS: Record<PlanName, PlanInfo> = {
    free:    { name: "Free",    price: 0,      promptLimit: 20,   razorpayPlanId: null },
    builder: { name: "Builder", price: 49900,  promptLimit: 1000, razorpayPlanId: config.razorpayPlanBuilder },
    pro:     { name: "Pro",     price: 99900,  promptLimit: 5000, razorpayPlanId: config.razorpayPlanPro },
};

// Statuses in which a paid plan still grants access ("pending" = Razorpay is retrying a failed charge)
const ACCESS_STATUSES: readonly SubscriptionStatus[] = ["active", "pending"];

export const grantsAccess = (status: SubscriptionStatus) => ACCESS_STATUSES.includes(status);

// "plan_xxx" from a webhook → "pro" | "builder". Throws on an unknown id so the webhook rolls back
// and Razorpay retries, instead of saving a payment with no plan.
export const planNameFromRazorpayId = (razorpayPlanId: string): PaidPlan => {
    if (razorpayPlanId === config.razorpayPlanPro) return "pro";
    if (razorpayPlanId === config.razorpayPlanBuilder) return "builder";
    throw new Error(`Unknown Razorpay plan id: ${razorpayPlanId}`);
};

// The plan a user can use right now. No row, or a paid row that isn't active/pending, means free.
export const effectivePlan = (sub: { plan: PlanName; status: SubscriptionStatus } | null): PlanName =>
    sub && grantsAccess(sub.status) ? sub.plan : "free";

// Usage bucket key: first day of the current UTC month, as 'YYYY-MM-01'
export const periodStart = (now: Date = new Date()): string =>
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
