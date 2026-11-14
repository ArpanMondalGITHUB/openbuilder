# Implementation Plan: Razorpay Billing Service

## Overview
Add a `billing` microservice (port 8004) that sells a monthly **Pro** plan through **Razorpay Subscriptions**.
It tracks each user's plan and usage, and tells the agent service whether a user may run another prompt.
The gateway stays the only public entry point, and the billing service owns its own tables.

You will write all the code yourself. This file covers the decisions; `tasks/todo.md` has the ordered steps.

---

## Architecture Decisions

1. **Billing owns its data, and the `users` table does not change.**
   Chat stores `user_id UUID` with no foreign key into auth's DB, and billing does the same.
   Plan and status live in billing's `subscriptions` table, keyed by `user_id`.
   *Why:* if you add `plan` to `users`, auth has to know about billing, and two services write the same truth.

2. **The webhook is the source of truth, not the browser.**
   The checkout success callback only *verifies the signature and shows "processing"*.
   The plan is upgraded only when the `subscription.activated` or `subscription.charged` webhook arrives.
   *Why:* a user can close the tab, and a browser callback can be faked.

3. **Two kinds of routes behave differently in the gateway.**
   | Route group | Gateway auth | Who calls it |
   |---|---|---|
   | `/api/v1/billing/*` (user routes) | `verifyAccessToken` (JWT), which forwards `x-user-id` | Frontend |
   | `/api/v1/billing/webhooks/razorpay` | **No JWT.** It is authenticated by the Razorpay HMAC signature | Razorpay servers |
   | `/internal/*` (usage check/consume) | **Not exposed through the gateway at all** | Agent service, with an `x-internal-key` header |

   The internal routes reuse the existing `INTERNAL_KEY` pattern that agent → chat already uses.

4. **The webhook needs the raw body.**
   Razorpay signs the exact bytes it sends. Mount `express.raw({ type: "application/json" })` on the webhook route **before** `app.use(express.json())`.
   If you don't, the signature check always fails.

5. **Amounts are integers in paise.** ₹999 is stored as `99900`. Never use floats.

6. **Usage limits are enforced in the agent service, before `graph.invoke`.**
   Agent calls `billing /internal/usage/consume` and gets a 402 if the user is over the limit.

---

## What each piece carries

### Database (billing's own migrations: `services/billing/db/migrations/1_init_billing.sql`)

**`subscriptions`**, one row per user (the current state)
| column | type | notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| user_id | UUID NOT NULL UNIQUE | from `x-user-id`, with no FK (it's a different service) |
| plan | TEXT NOT NULL DEFAULT 'free' | `'free' \| 'pro'` |
| status | TEXT NOT NULL DEFAULT 'active' | `created, authenticated, active, pending, halted, cancelled, completed` (these mirror Razorpay) |
| razorpay_subscription_id | TEXT UNIQUE NULL | `sub_xxx` |
| razorpay_customer_id | TEXT NULL | `cust_xxx` (optional) |
| current_period_start | TIMESTAMPTZ NULL | from webhook `current_start` (unix seconds, so convert it) |
| current_period_end | TIMESTAMPTZ NULL | from webhook `current_end` |
| cancel_at_period_end | BOOLEAN NOT NULL DEFAULT false | |
| created_at / updated_at | TIMESTAMPTZ | |

**`payments`** (history and receipts)
| column | type |
|---|---|
| id UUID PK, user_id UUID NOT NULL, razorpay_payment_id TEXT UNIQUE NOT NULL, razorpay_subscription_id TEXT, amount INTEGER NOT NULL (paise), currency TEXT NOT NULL DEFAULT 'INR', status TEXT NOT NULL (`captured`/`failed`), created_at |

**`webhook_events`** (idempotency, because Razorpay retries webhooks)
| column | type |
|---|---|
| event_id TEXT PK (from the `x-razorpay-event-id` header), event_type TEXT, payload JSONB, received_at TIMESTAMPTZ |

**`usage`** (metering)
| column | type |
|---|---|
| user_id UUID, period_start DATE, prompts_used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (user_id, period_start) |

Use `INSERT ... ON CONFLICT (user_id, period_start) DO UPDATE SET prompts_used = usage.prompts_used + 1 WHERE usage.prompts_used < $limit RETURNING prompts_used`. That is one atomic statement, so two parallel requests can't both slip past the limit.

> **Users table:** no new column is needed. Billing gets `user_id` from the gateway header. For the Razorpay checkout prefill (name/email), the frontend already has the logged-in user, so it passes them straight to Checkout.

### Routes

**User routes.** They go through the gateway with `verifyAccessToken`, and billing uses `requireGatewayUser` (copy it from chat).
| Method | Path | Body | Does |
|---|---|---|---|
| GET | `/api/v1/billing/plans` | none | Returns the static plan list (id, name, price in paise, limits). Can be public |
| GET | `/api/v1/billing/subscription` | none | The current user's plan, status, period end, and usage this period. If there's no row, treat the user as `free` |
| POST | `/api/v1/billing/subscription` | `{ planId: "pro" }` (zod) | Calls `razorpay.subscriptions.create({ plan_id, total_count: 12, customer_notify: 1, notes: { userId } })`, saves the row with status `created`, and returns `{ subscriptionId, keyId }` |
| POST | `/api/v1/billing/subscription/verify` | `{ razorpay_payment_id, razorpay_subscription_id, razorpay_signature }` | HMAC-SHA256(`payment_id + "\|" + subscription_id`, KEY_SECRET) compared with `crypto.timingSafeEqual`. Returns 200 `{ status: "processing" }` and does **not** upgrade the plan |
| POST | `/api/v1/billing/subscription/cancel` | `{ atCycleEnd?: boolean }` | `razorpay.subscriptions.cancel(id, atCycleEnd)`, then sets `cancel_at_period_end` |
| GET | `/api/v1/billing/payments` | none | The user's payment history |

**Webhook route.** In the gateway, mount it **before** the protected `/api/v1/billing` proxy, with no `verifyAccessToken`.
| POST | `/api/v1/billing/webhooks/razorpay` | raw JSON | Steps: 1) verify `x-razorpay-signature` as HMAC-SHA256(rawBody, WEBHOOK_SECRET); 2) insert into `webhook_events`, and if the insert conflicts, return 200 (already processed); 3) handle the event; 4) **always reply 200 quickly**. |

Events to handle:
| Event | Action |
|---|---|
| `subscription.authenticated` | status = authenticated |
| `subscription.activated` | plan = pro, status = active, set the period start/end |
| `subscription.charged` | insert into `payments`, extend `current_period_end` |
| `subscription.pending` | status = pending (payment retrying; keep access for now) |
| `subscription.halted` | status = halted, plan = free |
| `subscription.cancelled` / `subscription.completed` | status = cancelled/completed, plan = free |
| `payment.failed` | insert a `payments` row with status failed |

Find the user from `payload.subscription.entity.notes.userId`, or from `razorpay_subscription_id`.

**Internal routes.** Only agent calls them. They are *not* proxied by the gateway and are checked with `x-internal-key === INTERNAL_KEY`.
| POST | `/internal/usage/consume` | header `x-user-id` | Looks up the plan limit and runs the atomic increment. Returns 200 `{ remaining }` or **402** `{ message: "Limit reached", upgrade: true }` |

### Environment variables
**billing `.env`**
```
PORT=8004
JWT_SECRET=...            # present in config; not actually needed if you trust gateway headers, so you can drop it
DATABASE_URL=...          # billing's own DB (or the same server, separate database)
RAZORPAY_KEY_ID=rzp_test_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx   # you set this yourself in the Dashboard → Webhooks
RAZORPAY_PLAN_PRO=plan_xxx    # created in the Dashboard → Subscriptions → Plans
INTERNAL_KEY=...              # same value as in the agent service
```
**gateway `.env`:** `BILLING_SERVICE=http://localhost:8004`
**agent `.env`:** `BILLING_SERVICE=http://localhost:8004` (`INTERNAL_KEY` already exists)
**frontend:** nothing secret. `keyId` comes from the API response, and **never** put KEY_SECRET in the frontend.

---

## Existing problems in the current scaffold (fix these first)
- `gateway.config.ts`: `required("Billing_SERVICE")` has mixed casing. Rename it to `BILLING_SERVICE`, add `,`, and add a trailing newline.
- `billing/index.ts`: the log says `auth start to listning`. Change it to `billing`.
- `billing.middlewares.ts`: the `23505` handler says "Email already registered", which is wrong for billing. Use a generic "Duplicate record", or remove it.
- `billing/package.json`: `bcrypt`, `express-http-proxy` and `cors` aren't needed here. Add `razorpay`.
- `billing/index.ts`: there's no `requireGatewayUser` yet, no routes, and the raw-body webhook isn't mounted.

---

## Task List (detail in `tasks/todo.md`)

### Phase 1: Foundation
- [ ] T1: Razorpay account, test keys, Pro plan
- [ ] T2: Clean up the scaffold and config/env
- [ ] T3: DB migration (4 tables)
### Checkpoint A: the service boots, migration runs, `GET /` works through the gateway

### Phase 2: Payment flow
- [ ] T4: Gateway wiring (protected routes plus a public webhook)
- [ ] T5: GET plans / GET subscription
- [ ] T6: POST create subscription, plus frontend Checkout
- [ ] T7: POST verify
- [ ] T8: Webhook handler (signature, idempotency, events)
### Checkpoint B: a test card payment makes a user `pro` via the webhook

### Phase 3: Enforcement and polish
- [ ] T9: Usage consume endpoint
- [ ] T10: Agent calls consume before `graph.invoke`
- [ ] T11: Cancel and payment history
- [ ] T12: Frontend billing page and 402 handling
### Checkpoint C: a free user is blocked at the limit, upgrading unblocks them, and cancelling downgrades them at period end

---

## Controllers and Queries (the layer you write)

### File layout
```
billing/
  db/billing.queries.ts               all SQL (one function per query, like chat.queries.ts)
  helpers/plans.ts                    PLANS constant + planNameFromRazorpayId() + periodStart()
  helpers/signature.ts                verifyCheckoutSignature(), verifyWebhookSignature()
  models/billing.zod_models.ts        createSubscriptionSchema, verifySchema, cancelSchema
  controllers/billing.controllers.ts  user routes (JWT through gateway)
  controllers/webhook.controllers.ts  Razorpay webhook
  controllers/internal.controllers.ts agent → billing usage check
  routes/billing.routes.ts            /api/v1/billing/*  (requireGatewayUser)
  routes/internal.routes.ts           /internal/*        (requireInternalKey)
```

### Helpers (no DB)
| Function | Does |
|---|---|
| `PLANS` | `{ free: {limit, price:0, razorpayPlanId:null}, pro: {limit, price:99900, razorpayPlanId: config.razorpayPlanPro}, builder: {...} }` |
| `planNameFromRazorpayId(planId)` | `"plan_TzZK..."` → `"pro"`. The webhook uses it to tell which plan was bought |
| `periodStart(now)` | First day of the current calendar month (a `YYYY-MM-01` string). This is the `usage` key |
| `verifyCheckoutSignature(paymentId, subId, sig)` | HMAC-SHA256(`paymentId + "\|" + subId`, keySecret) + `timingSafeEqual` |
| `verifyWebhookSignature(rawBody, sig)` | HMAC-SHA256(rawBody Buffer, webhookSecret) + `timingSafeEqual` |

### Queries (`db/billing.queries.ts`)
✅ Written. Every query takes an optional last argument `db` (`Pool | PoolClient`, default `pool`). The webhook passes its transaction `client` to the queries marked **(tx)**.

| # | Function | SQL |
|---|---|---|
| Q1 | `getSubscriptionByUserId(userId)` | `SELECT * FROM subscriptions WHERE user_id = $1` → `rows[0] ?? null` |
| Q2 | `getSubscriptionByRazorpayId(subId)` | `SELECT * FROM subscriptions WHERE razorpay_subscription_id = $1` |
| Q3 | `upsertCreatedSubscription(userId, rzpSubId)` | `INSERT INTO subscriptions (user_id, status, razorpay_subscription_id) VALUES ($1,'created',$2) ON CONFLICT (user_id) DO UPDATE SET status='created', razorpay_subscription_id=EXCLUDED.razorpay_subscription_id, cancel_at_period_end=false, updated_at=now() RETURNING *`. **Plan stays as it is.** It only changes when the webhook arrives |
| Q4 | `syncSubscriptionFromWebhook(client, {rzpSubId, plan, status, periodStart, periodEnd})` **(tx)** | `UPDATE subscriptions SET plan=$2, status=$3, current_period_start=COALESCE(to_timestamp($4), current_period_start), current_period_end=COALESCE(to_timestamp($5), current_period_end), updated_at=now() WHERE razorpay_subscription_id=$1 RETURNING *`. Pass unix seconds or null. If 0 rows come back, it's a stale or old subscription, so log it and ignore it |
| Q5 | `setCancelAtPeriodEnd(userId)` | `UPDATE subscriptions SET cancel_at_period_end=true, updated_at=now() WHERE user_id=$1 RETURNING *` |
| Q6 | `insertPayment(client, p)` **(tx)** | `INSERT INTO payments (user_id, razorpay_payment_id, razorpay_subscription_id, amount, currency, status) VALUES (...) ON CONFLICT (razorpay_payment_id) DO UPDATE SET status=EXCLUDED.status` |
| Q7 | `listPaymentsByUser(userId)` | `SELECT id, amount, currency, status, created_at FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50` |
| Q8 | `insertWebhookEvent(client, id, type, payload)` **(tx)** | `INSERT INTO webhook_events (event_id, event_type, payload) VALUES ($1,$2,$3) ON CONFLICT (event_id) DO NOTHING RETURNING event_id`. If no row comes back, it's a duplicate |
| Q9 | `getUsage(userId, periodStart)` | `SELECT prompts_used FROM usage WHERE user_id=$1 AND period_start=$2` → `rows[0]?.prompts_used ?? 0` |
| Q10 | `consumeUsage(userId, periodStart, limit)` | `INSERT INTO usage (user_id, period_start, prompts_used) VALUES ($1,$2,1) ON CONFLICT (user_id, period_start) DO UPDATE SET prompts_used = usage.prompts_used + 1 WHERE usage.prompts_used < $3 RETURNING prompts_used`. If no row comes back, the user is over the limit. This is a single atomic statement, so it's safe when requests race |
| Q11 *(optional)* | `refundUsage(userId, periodStart)` | `UPDATE usage SET prompts_used = GREATEST(prompts_used-1,0) WHERE user_id=$1 AND period_start=$2`. Agent calls it if the graph fails or is cancelled, so the user isn't charged for it |

### Controllers

**`billing.controllers.ts`** (user routes; `userId = req.user.id` from `requireGatewayUser`)
| Controller | Route | Steps | Queries |
|---|---|---|---|
| `handleGetPlans` | GET /plans | Return the PLANS (names, prices, limits). Never return the Razorpay plan ids or secrets | none |
| `handleGetSubscription` | GET /subscription | 1) Get the sub. If there's none, it's `{plan:'free', status:'active'}`. 2) used = getUsage. 3) Return `{plan, status, currentPeriodEnd, cancelAtPeriodEnd, used, limit}` | Q1, Q9 |
| `handleCreateSubscription` | POST /subscription | 1) Validate `planId`, which must be `pro` or `builder`. 2) If the existing sub has status `active` and plan isn't free, return 409. 3) `razorpay.subscriptions.create({plan_id: PLANS[planId].razorpayPlanId, total_count:12, customer_notify:1, notes:{userId}})`. 4) Upsert. 5) Return `{subscriptionId, keyId}` | Q1, Q3 |
| `handleVerifySubscription` | POST /subscription/verify | 1) Verify the signature, or return 400. 2) Get the sub by its rzp id and check `sub.user_id === userId`, or return 403. 3) Return `{status:'processing'}`. **No DB write** | Q2 |
| `handleCancelSubscription` | POST /subscription/cancel | 1) Get the sub. It must have a `razorpay_subscription_id` and status `active`, or return 400. 2) `razorpay.subscriptions.cancel(id, true)`, which cancels at the end of the cycle. 3) Set the flag | Q1, Q5 |
| `handleListPayments` | GET /payments | List the user's payments | Q7 |

**`webhook.controllers.ts`**
`handleRazorpayWebhook` handles POST /webhooks/razorpay, with `express.raw` mounted before `express.json`:
1. `verifyWebhookSignature(req.body, req.header("x-razorpay-signature"))`. If it fails, return 400.
2. `const event = JSON.parse(req.body.toString())` and `eventId = req.header("x-razorpay-event-id")`.
3. `const client = await pool.connect(); await client.query("BEGIN")`
4. Q8 insert event. If it's a duplicate, `COMMIT` and return 200.
5. If `event.event` starts with `subscription.`:
   - `const s = event.payload.subscription.entity`
   - `status = s.status`
   - `plan = (status === 'active' || status === 'pending') ? planNameFromRazorpayId(s.plan_id) : 'free'`
   - Q4 with `s.id, plan, status, s.current_start, s.current_end`
6. If `event.event === 'subscription.charged'` and `event.payload.payment`, run Q6 with the payment entity (`id, amount, currency, status`) and the user_id from Q4's returned row.
7. `COMMIT` and return 200. In `catch`, `ROLLBACK` and return 500, so Razorpay retries. Call `client.release()` in `finally`.

**Why use a transaction?** Without one, the event row could be saved while the update fails. Razorpay's retry would then look like a duplicate, so the upgrade would never be applied.

**Why does a single generic sync work?** Every `subscription.*` event carries the full subscription entity. Copying its state over is idempotent, so the events don't need to arrive in order.

**`internal.controllers.ts`**
| Controller | Route | Steps | Queries |
|---|---|---|---|
| `handleConsumeUsage` | POST /internal/usage/consume | 1) Read `userId` from the `x-user-id` header, or return 400. 2) Get the sub. Its plan applies only if status is active or pending, otherwise use free. 3) Q10 with `PLANS[plan].limit`. 4) If a row comes back, return 200 `{used, limit}`. If not, return **402** `{message:'Limit reached', upgrade:true}` | Q1, Q10 |
| `handleRefundUsage` *(optional)* | POST /internal/usage/refund | Q11 | Q11 |

### Build order
Write the queries and controllers in this order, testing each one as you go:
1. Q1 and Q9, then `handleGetSubscription`.
2. Q3, then `handleCreateSubscription`.
3. Q2, then verify.
4. Q8, Q4 and Q6, then the webhook.
5. Q10, then consume.
6. Q5 and Q7, then cancel and payments.

---

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Webhook signature fails because the body was parsed | High | `express.raw` on the webhook route before `express.json`. Check that express-http-proxy forwards the body unchanged |
| Duplicate webhooks double-count | High | `webhook_events` PK on event id, and `payments.razorpay_payment_id UNIQUE` |
| Webhooks can't reach localhost | Med | `ngrok http 8000` and point the Dashboard webhook at the ngrok URL |
| Race: two prompts at the limit | Med | Single atomic `INSERT ... ON CONFLICT ... WHERE prompts_used < limit` |
| Billing down, so agent is down | Med | Decide **fail-open** (allow, and log it) vs **fail-closed**. Recommend fail-open with a short timeout (2s) |
| Secret leaks | High | Key secret and webhook secret only in billing `.env`. Use `timingSafeEqual` for signature compares |

## Open Questions
- Is it subscriptions (monthly Pro) or one-time credit packs (Razorpay **Orders**)? This plan assumes subscriptions. For credit packs, swap T6–T8 to `orders.create` and the `payment.captured` event, with signature `order_id|payment_id`.
- What are the limits? For example: free = 20 prompts/month, pro = 1000/month.
- Should usage reset on the calendar month, or on the subscription `current_period_start`?
