import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import crypto from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Route-wiring tests: every case here is answered before any DB or Razorpay call.
process.env.JWT_SECRET = "test-jwt";
process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
process.env.RAZORPAY_API_KEY = "rzp_test_key";
process.env.RAZORPAY_SECRET = "test-key-secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
process.env.RAZORPAY_PLAN_PRO = "plan_PRO123";
process.env.RAZORPAY_PLAN_BUILDER = "plan_BUILDER123";
process.env.INTERNAL_KEY = "test-internal-key";

const { app } = require("../app") as typeof import("../app");

const USER = "11111111-1111-4111-8111-111111111111";
let server: Server;
let base: string;

before(async () => {
    server = app.listen(0);
    await new Promise((r) => server.once("listening", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const call = (path: string, init: RequestInit = {}) => fetch(base + path, init);
const json = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
});

// ── public ─────────────────────────────────────────────────
test("GET /plans lists plans without exposing razorpay plan ids", async () => {
    const res = await call("/api/v1/billing/plans");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.plans.map((p: any) => p.id).sort(), ["builder", "free", "pro"]);
    assert.ok(!JSON.stringify(body).includes("plan_PRO123"));
});

// ── user routes need the gateway user header ───────────────
test("user routes reject requests without x-user-id", async () => {
    for (const [method, path] of [
        ["GET", "/api/v1/billing/subscription"],
        ["POST", "/api/v1/billing/subscription"],
        ["POST", "/api/v1/billing/subscription/verify"],
        ["POST", "/api/v1/billing/subscription/cancel"],
        ["GET", "/api/v1/billing/payments"],
    ]) {
        const res = await call(path, { method });
        assert.equal(res.status, 401, `${method} ${path}`);
    }
});

test("POST /subscription validates planId", async () => {
    const bad = await call("/api/v1/billing/subscription", json({ planId: "free" }, { "x-user-id": USER }));
    assert.equal(bad.status, 400);
    const missing = await call("/api/v1/billing/subscription", json({}, { "x-user-id": USER }));
    assert.equal(missing.status, 400);
});

test("POST /subscription/verify validates razorpay fields", async () => {
    const res = await call(
        "/api/v1/billing/subscription/verify",
        json({ razorpay_payment_id: "x", razorpay_subscription_id: "sub_A", razorpay_signature: "zz" }, { "x-user-id": USER })
    );
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.message, "Validation failed");
});

// ── webhook: public, raw body, signature checked ───────────
test("webhook receives the raw body and rejects a bad signature", async () => {
    const res = await call("/api/v1/billing/webhooks/razorpay", json(
        { event: "subscription.activated" },
        { "x-razorpay-signature": "0".repeat(64), "x-razorpay-event-id": "evt_1" }
    ));
    assert.equal(res.status, 400);
    // "Expected raw body" here would mean express.json() ran first
    assert.equal((await res.json()).message, "Invalid webhook signature");
});

test("webhook does not require x-user-id", async () => {
    const body = JSON.stringify({ event: "x" });
    const sig = crypto.createHmac("sha256", "test-webhook-secret").update(body).digest("hex");
    const res = await call("/api/v1/billing/webhooks/razorpay", {
        method: "POST",
        headers: { "content-type": "application/json", "x-razorpay-signature": sig }, // no event id
        body,
    });
    // signature passed and it got past auth; stops at the missing event id, before the DB
    assert.equal(res.status, 400);
    assert.equal((await res.json()).message, "Missing x-razorpay-event-id");
});

// ── internal: key required, not under /api/v1/billing ─────
test("internal routes reject missing or wrong internal key", async () => {
    const none = await call("/internal/usage/consume", { method: "POST", headers: { "x-user-id": USER } });
    assert.equal(none.status, 401);
    const wrong = await call("/internal/usage/consume", {
        method: "POST",
        headers: { "x-user-id": USER, "x-internal-key": "nope" },
    });
    assert.equal(wrong.status, 401);
});

test("internal routes validate x-user-id", async () => {
    const res = await call("/internal/usage/consume", {
        method: "POST",
        headers: { "x-user-id": "not-a-uuid", "x-internal-key": "test-internal-key" },
    });
    assert.equal(res.status, 400);
});

test("internal routes are not reachable under the gateway prefix", async () => {
    const res = await call("/api/v1/billing/internal/usage/consume", {
        method: "POST",
        headers: { "x-user-id": USER, "x-internal-key": "test-internal-key" },
    });
    assert.equal(res.status, 404);
});
