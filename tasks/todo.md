# Razorpay Billing: Step-by-Step Tasks

See `tasks/plan.md` for the decisions, table columns, route table and env vars.

---

## Task 1: Razorpay account setup (no code)
**Description:** Get test credentials and create the Pro plan.
**Steps:**
1. Sign up at dashboard.razorpay.com and stay in **Test Mode**.
2. Go to Settings → API Keys → Generate. Save `rzp_test_...` and the secret. The secret is shown once.
3. Go to Subscriptions → Plans → Create: monthly, interval 1, ₹999. Copy `plan_...`.
4. Don't create the webhook yet. That's Task 8.
**Acceptance:**
- [ ] You have the key id, key secret and plan id
**Dependencies:** None · **Scope:** XS

## Task 2: Clean up the scaffold, config and deps
**Description:** Make the billing service boot cleanly with the right env.
**Steps:**
1. `cd backend/services/billing && npm i razorpay` and `npm uninstall bcrypt express-http-proxy cors @types/bcrypt @types/express-http-proxy @types/cors`.
2. `billing.config.ts`: add `razorpayKeyId`, `razorpayKeySecret`, `razorpayWebhookSecret`, `razorpayPlanPro`, and `internalKey` (all `required(...)`).
3. Create `helpers/razorpay.ts`, which exports one `new Razorpay({ key_id, key_secret })`.
4. Copy `requireGatewayUser` from `chat.middlewares.ts` into `billing.middlewares.ts`. Add `requireInternalKey`, which compares the `x-internal-key` header with config.
5. Fix the 23505 message and the "auth start" log.
6. Gateway: rename the env to `BILLING_SERVICE` in `gateway.config.ts` and `.env`.
**Acceptance:**
- [ ] `npm run dev` starts on 8004 with no missing-env error
- [ ] `GET localhost:8004/` returns JSON
**Files:** `billing/config/billing.config.ts`, `billing/helpers/razorpay.ts`, `billing/middlewares/billing.middlewares.ts`, `billing/index.ts`, `gateway/config/gateway.config.ts`
**Dependencies:** T1 · **Scope:** S

## Task 3: DB migration
**Description:** Create the `subscriptions`, `payments`, `webhook_events` and `usage` tables (columns are in plan.md).
**Steps:**
1. Create `db/migrations/1_init_billing.sql`, starting with `CREATE EXTENSION IF NOT EXISTS "pgcrypto";` (same style as auth).
2. Add an index on `payments(user_id)`.
3. Run `npm run migrate`.
**Acceptance:**
- [ ] All 4 tables exist (`\dt`)
- [ ] `subscriptions.user_id` and `payments.razorpay_payment_id` are UNIQUE
**Dependencies:** T2 · **Scope:** XS

### Checkpoint A
- [ ] Billing boots, the migration ran, and you've done a manual `psql` check

## Task 4: Gateway wiring
**Description:** Proxy the billing routes, with the webhook left public.
**Steps:**
1. In `gateway/index.ts`, add the webhook proxy **first**, with no auth:
   `app.use("/api/v1/billing/webhooks", proxy(config.billingServiceUrl, { proxyReqPathResolver: req => "/api/v1/billing/webhooks" + req.url }))`
2. Then add the protected one: `app.use("/api/v1/billing", verifyAccessToken, proxy(...))`, the same as chat.
3. Don't proxy `/internal`.
**Acceptance:**
- [ ] `GET /api/v1/billing/subscription` with no token returns 401 from the gateway
- [ ] `POST /api/v1/billing/webhooks/razorpay` with no token reaches billing (any non-401)
**Dependencies:** T2 · **Scope:** XS

## Task 5: GET plans and GET subscription
**Description:** Read endpoints. With no row, the user is free.
**Steps:**
1. `routes/billing.routes.ts` uses `router.use(requireGatewayUser)`, but put `GET /plans` before it if you want it public.
2. Queries go in `db/billing.queries.ts`: `getSubscriptionByUserId`, `getUsage(userId, periodStart)`.
3. Keep a `PLANS` constant in `helpers/plans.ts`: `{ free: { limit: 20, price: 0 }, pro: { limit: 1000, price: 99900, razorpayPlanId } }`.
**Acceptance:**
- [ ] A new user gets `{ plan: "free", status: "active", used: 0, limit: 20 }`
**Dependencies:** T3, T4 · **Scope:** S

## Task 6: Create subscription and frontend Checkout
**Description:** The user clicks Upgrade, then the Razorpay popup opens.
**Steps (backend):**
1. `POST /subscription`, with zod `{ planId: z.literal("pro") }`.
2. If the user already has an `active` pro subscription, return 409.
3. Call `razorpay.subscriptions.create({ plan_id, total_count: 12, customer_notify: 1, notes: { userId } })`.
4. Upsert into `subscriptions` with `status='created'` and `razorpay_subscription_id`.
5. Return `{ subscriptionId, keyId }`.
**Steps (frontend, in `web/`):**
1. Load `https://checkout.razorpay.com/v1/checkout.js`.
2. Call `new Razorpay({ key: keyId, subscription_id, name: "OpenBuilder", prefill: { name, email }, handler: (resp) => POST /subscription/verify }).open()`.
**Acceptance:**
- [ ] The popup opens, and the test card `4111 1111 1111 1111` succeeds
- [ ] The row exists with status `created`
**Dependencies:** T5 · **Scope:** M

## Task 7: Verify endpoint
**Description:** Check the checkout signature and tell the UI to wait for the webhook.
**Steps:**
1. Use `expected = crypto.createHmac("sha256", keySecret).update(payment_id + "|" + subscription_id).digest("hex")`.
2. Compare with `crypto.timingSafeEqual` (check the buffer lengths first). If it doesn't match, return 400.
3. Check that the `subscription_id` belongs to this `x-user-id`. If not, return 403.
4. Return `{ status: "processing" }` and **don't** set plan = pro here.
**Acceptance:**
- [ ] A valid signature returns 200, and a tampered one returns 400
**Dependencies:** T6 · **Scope:** S

## Task 8: Webhook handler (the most important part)
**Description:** Make the webhook the only place where plan state changes.
**Steps:**
1. In `index.ts`, add `app.post("/api/v1/billing/webhooks/razorpay", express.raw({ type: "application/json" }), handleWebhook)` **above** `app.use(express.json())`.
2. Verify `x-razorpay-signature` as HMAC-SHA256(req.body Buffer, webhookSecret). If it fails, return 400.
3. `INSERT INTO webhook_events (event_id, ...) ON CONFLICT DO NOTHING RETURNING event_id`. If no row comes back, it's a duplicate, so return 200.
4. Switch on `event` (the table in plan.md) and update `subscriptions`/`payments`. Convert unix seconds to timestamps.
5. Reply 200 quickly. On an unexpected error, log it and return 500 so Razorpay retries.
6. Dev: run `ngrok http 8000`. In the Dashboard, go to Webhooks and add `https://<ngrok>/api/v1/billing/webhooks/razorpay`. Set a secret (put it in `.env`) and tick the subscription.* and payment.failed events.
**Acceptance:**
- [ ] After a test payment, the user's row becomes `plan='pro', status='active'`, and a `payments` row exists
- [ ] Resending the same webhook from the Dashboard doesn't create a duplicate payment
- [ ] A bad signature returns 400
**Dependencies:** T4, T6 · **Scope:** M

### Checkpoint B
- [ ] Test payment → webhook → user is `pro`. GET subscription shows it, and the UI refreshes it

## Task 9: Usage consume (internal)
**Description:** An atomic check-and-increment of the prompt counter.
**Steps:**
1. Mount `app.use("/internal", requireInternalKey, internalRouter)` and **don't** add it to the gateway.
2. `POST /internal/usage/consume` reads `x-user-id`, resolves the plan (pro only if status is `active`/`pending`), and gets the limit.
3. Run the atomic `INSERT ... ON CONFLICT ... DO UPDATE ... WHERE prompts_used < $limit RETURNING`. If no row comes back, return 402.
**Acceptance:**
- [ ] The 21st call for a free user returns 402
- [ ] A missing or wrong internal key returns 401
**Dependencies:** T3 · **Scope:** S

## Task 10: Agent enforces the limit
**Description:** Block prompts when the user is over the limit.
**Steps:**
1. Add `billingUrl: required("BILLING_SERVICE")` to `agent.config.ts`.
2. In `handleInvokeGraph`, **before** `graph.invoke`, call axios POST `${billingUrl}/internal/usage/consume` with `x-internal-key` and `x-user-id`, and `timeout: 2000`.
3. On 402, return 402 to the client. On a network error or timeout, follow the decision in plan.md (fail-open is recommended).
**Acceptance:**
- [ ] Over the limit, agent returns 402 and the graph never runs
**Dependencies:** T9 · **Scope:** S

## Task 11: Cancel and payment history
**Steps:**
1. `POST /subscription/cancel`: `razorpay.subscriptions.cancel(subId, true)` (cancels at cycle end), then set `cancel_at_period_end=true`. The webhook `subscription.cancelled` later downgrades the user.
2. `GET /payments`: list by user, newest first.
**Acceptance:**
- [ ] After cancelling, the user stays pro until the period ends, and then the webhook sets them to free
**Dependencies:** T8 · **Scope:** S

## Task 12: Frontend billing page and 402 handling
**Steps:**
1. Build a billing page with the current plan, a usage bar, an Upgrade or Cancel button, and payment history.
2. In the chat UI, when an agent call returns 402, show an "Limit reached — Upgrade" prompt.
3. After verify returns `processing`, poll `GET /subscription` every 2 seconds, for up to 30 seconds, until it shows `pro`.
**Acceptance:**
- [ ] Full flow from the UI: hit the limit → upgrade → keep chatting
**Dependencies:** T6, T10, T11 · **Scope:** M

### Checkpoint C
- [ ] Free limit enforced, upgrade works end-to-end, cancel downgrades at period end, duplicate webhooks are safe
- [ ] Switch to Live keys only after doing KYC in Razorpay, and use a new webhook secret for live
