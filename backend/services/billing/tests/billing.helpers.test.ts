import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

// config.ts reads these at import time, so set them before requiring anything
process.env.JWT_SECRET = "test-jwt";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.RAZORPAY_API_KEY = "rzp_test_key";
process.env.RAZORPAY_SECRET = "test-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.RAZORPAY_PLAN_PRO = "plan_PRO123";
process.env.RAZORPAY_PLAN_BUILDER = "plan_BUILDER123";
process.env.INTERNAL_KEY = "test-internal-key";

const { verifyCheckoutSignature, verifyWebhookSignature } =
    require("../helpers/signature") as typeof import("../helpers/signature");
const { planNameFromRazorpayId, periodStart, effectivePlan } =
    require("../helpers/plans") as typeof import("../helpers/plans");
const { requireInternalKey } =
    require("../middlewares/billing.middlewares") as typeof import("../middlewares/billing.middlewares");

const hmac = (secret: string, data: string | Buffer) =>
    crypto.createHmac("sha256", secret).update(data).digest("hex");

// ── checkout signature ─────────────────────────────────────
test("checkout signature: accepts HMAC of payment_id|subscription_id", () => {
    const sig = hmac("test-key-secret", "pay_A|sub_B");
    assert.equal(verifyCheckoutSignature("pay_A", "sub_B", sig), true);
});

test("checkout signature: rejects swapped ids", () => {
    const sig = hmac("test-key-secret", "pay_A|sub_B");
    assert.equal(verifyCheckoutSignature("sub_B", "pay_A", sig), false);
});

test("checkout signature: rejects malformed signature without throwing", () => {
    assert.equal(verifyCheckoutSignature("pay_A", "sub_B", "not-hex"), false);
    assert.equal(verifyCheckoutSignature("pay_A", "sub_B", ""), false);
});

// ── webhook signature ──────────────────────────────────────
test("webhook signature: accepts HMAC of the exact raw body", () => {
    const body = Buffer.from('{"event":"subscription.activated"}');
    assert.equal(verifyWebhookSignature(body, hmac("test-webhook-secret", body)), true);
});

test("webhook signature: rejects a body that changed by one byte", () => {
    const sig = hmac("test-webhook-secret", Buffer.from('{"a":1}'));
    assert.equal(verifyWebhookSignature(Buffer.from('{"a":2}'), sig), false);
});

test("webhook signature: rejects missing header", () => {
    assert.equal(verifyWebhookSignature(Buffer.from("{}"), undefined), false);
});

test("webhook signature: rejects key-secret signature (wrong secret)", () => {
    const body = Buffer.from("{}");
    assert.equal(verifyWebhookSignature(body, hmac("test-key-secret", body)), false);
});

// ── plans ──────────────────────────────────────────────────
test("planNameFromRazorpayId maps configured plan ids", () => {
    assert.equal(planNameFromRazorpayId("plan_PRO123"), "pro");
    assert.equal(planNameFromRazorpayId("plan_BUILDER123"), "builder");
});

test("planNameFromRazorpayId throws on an unknown plan id", () => {
    assert.throws(() => planNameFromRazorpayId("plan_UNKNOWN"));
});

test("periodStart is the first day of the UTC month", () => {
    assert.equal(periodStart(new Date("2026-11-13T10:00:00Z")), "2026-11-01");
    assert.equal(periodStart(new Date("2026-01-31T23:59:59Z")), "2026-01-01");
});

test("effectivePlan: no row is free", () => {
    assert.equal(effectivePlan(null), "free");
});

test("effectivePlan: paid plan only counts while active or pending", () => {
    assert.equal(effectivePlan({ plan: "pro", status: "active" }), "pro");
    assert.equal(effectivePlan({ plan: "pro", status: "pending" }), "pro");
    assert.equal(effectivePlan({ plan: "pro", status: "halted" }), "free");
    assert.equal(effectivePlan({ plan: "builder", status: "created" }), "free");
});

// ── internal key middleware ────────────────────────────────
const runMiddleware = (key: string | undefined) => {
    let passedError: unknown = "not-called";
    const req = { header: (name: string) => (name === "x-internal-key" ? key : undefined) } as any;
    requireInternalKey(req, {} as any, (err?: unknown) => { passedError = err; });
    return passedError;
};

test("requireInternalKey: allows the correct key", () => {
    assert.equal(runMiddleware("test-internal-key"), undefined);
});

test("requireInternalKey: rejects a wrong key", () => {
    assert.ok(runMiddleware("wrong-key") instanceof Error);
});

test("requireInternalKey: rejects a missing key", () => {
    assert.ok(runMiddleware(undefined) instanceof Error);
});
