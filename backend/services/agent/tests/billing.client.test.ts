import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import http from "node:http";
import type { AddressInfo } from "node:net";

// A fake billing service. Each test sets `reply` to choose what it answers.
let reply: (req: http.IncomingMessage, res: http.ServerResponse) => void = () => {};
const seen: { path?: string; key?: string; userId?: string }[] = [];
const fake = http.createServer((req, res) => {
    seen.push({ path: req.url, key: req.headers["x-internal-key"] as string, userId: req.headers["x-user-id"] as string });
    reply(req, res);
});

let consumePrompt: typeof import("../services/billing.client").consumePrompt;
let refundPrompt: typeof import("../services/billing.client").refundPrompt;

before(async () => {
    fake.listen(0);
    await new Promise((r) => fake.once("listening", r));
    process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
    process.env.CHAT_SERVICE = "http://127.0.0.1:1";
    process.env.INTERNAL_KEY = "test-internal-key";
    process.env.BILLING_SERVICE = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
    ({ consumePrompt, refundPrompt } = require("../services/billing.client") as typeof import("../services/billing.client"));
});
after(() => fake.close());

const USER = "11111111-1111-4111-8111-111111111111";
const send = (status: number, body: unknown) => (_req: any, res: http.ServerResponse) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify(body));
};

test("consumePrompt: 200 → counted, sends internal key and user id", async () => {
    seen.length = 0;
    reply = send(200, { used: 3, limit: 20, remaining: 17 });
    const result = await consumePrompt(USER);
    assert.equal(result.counted, true);
    assert.deepEqual(seen[0], { path: "/internal/usage/consume", key: "test-internal-key", userId: USER });
});

test("consumePrompt: 402 → throws ApiError 402 (user over limit)", async () => {
    reply = send(402, { message: "Monthly prompt limit reached", limit: 20, upgrade: true });
    await assert.rejects(consumePrompt(USER), (err: any) => err.statusCode === 402);
});

test("consumePrompt: billing 500 → fails open, not counted", async () => {
    reply = send(500, { message: "boom" });
    const result = await consumePrompt(USER);
    assert.equal(result.counted, false);
});

test("consumePrompt: billing 401 (bad internal key) → fails open, not counted", async () => {
    reply = send(401, { message: "Invalid internal key" });
    assert.equal((await consumePrompt(USER)).counted, false);
});

test("consumePrompt: billing hangs → times out, fails open", async () => {
    reply = () => {}; // never answers
    const started = Date.now();
    const result = await consumePrompt(USER);
    assert.equal(result.counted, false);
    assert.ok(Date.now() - started < 5_000, "should time out quickly");
});

test("refundPrompt: calls refund and never throws", async () => {
    seen.length = 0;
    reply = (_req, res) => { res.writeHead(204); res.end(); };
    await refundPrompt(USER);
    assert.equal(seen[0]?.path, "/internal/usage/refund");

    reply = send(500, {});
    await refundPrompt(USER); // must not throw
});
