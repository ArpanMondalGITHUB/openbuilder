import assert from "node:assert/strict";
import test from "node:test";

process.env.JWT_SECRET = "test-jwt";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.RAZORPAY_API_KEY = "rzp_test_key";
process.env.RAZORPAY_SECRET = "test-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.RAZORPAY_PLAN_PRO = "plan_PRO123";
process.env.RAZORPAY_PLAN_BUILDER = "plan_BUILDER123";
process.env.INTERNAL_KEY = "test-internal-key";

const { subscriptionUpdateFrom, paymentIdsFromInvoices } = require("../helpers/sync") as typeof import("../helpers/sync");

const entity = (status: any, plan_id = "plan_BUILDER123") => ({
    id: "sub_ABC", plan_id, status, current_start: 1_700_000_000, current_end: 1_702_592_000,
});

// Regression: a paid checkout must flip the row to the paid plan from Razorpay's state alone,
// without waiting for a webhook (webhooks never reach localhost).
test("sync: an active Razorpay subscription grants the paid plan", () => {
    const { update, paidPlan } = subscriptionUpdateFrom(entity("active"));
    assert.equal(paidPlan, "builder");
    assert.deepEqual(update, {
        rzpSubId: "sub_ABC", plan: "builder", status: "active",
        periodStart: 1_700_000_000, periodEnd: 1_702_592_000,
    });
});

test("sync: authenticated/created (not yet charged) stays free", () => {
    assert.equal(subscriptionUpdateFrom(entity("authenticated")).update.plan, "free");
    assert.equal(subscriptionUpdateFrom(entity("created")).update.plan, "free");
});

test("sync: halted/cancelled drops to free; pending keeps access", () => {
    assert.equal(subscriptionUpdateFrom(entity("halted", "plan_PRO123")).update.plan, "free");
    assert.equal(subscriptionUpdateFrom(entity("cancelled", "plan_PRO123")).update.plan, "free");
    assert.equal(subscriptionUpdateFrom(entity("pending", "plan_PRO123")).update.plan, "pro");
});

test("sync: unknown Razorpay plan id throws", () => {
    assert.throws(() => subscriptionUpdateFrom(entity("active", "plan_NOPE")), /Unknown Razorpay plan id/);
});

// Regression: payments made without a webhook never reached history. Backfill reads them off invoices.
test("backfill: payment ids come from invoices, deduped, unpaid invoices skipped", () => {
    const invoices = [
        { payment_id: "pay_A1" },
        { payment_id: null },          // issued, not paid yet
        {},                            // no payment field at all
        { payment_id: "pay_A1" },      // same charge twice
        { payment_id: "pay_B2" },
    ];
    assert.deepEqual(paymentIdsFromInvoices(invoices), ["pay_A1", "pay_B2"]);
});

test("backfill: includes the verified checkout payment, ignores junk ids", () => {
    assert.deepEqual(paymentIdsFromInvoices([{ payment_id: "pay_A1" }], "pay_NEW"), ["pay_A1", "pay_NEW"]);
    assert.deepEqual(paymentIdsFromInvoices([{ payment_id: "inv_X" }, { payment_id: "pay_'; drop" }], undefined), []);
});
