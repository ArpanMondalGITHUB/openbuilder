# System Design

Diagrams first, plain-English explanations next to each arrow. Read top to bottom.

---

## 1. The big picture

```
                    YOUR NETWORK
                    ────────────
                                                             ┌────────────┐
                                                             │  Postgres  │
                                                             │  (auth)    │
                                                             └─────▲──────┘
                                                                   │
┌──────────┐           ┌──────────────┐         ┌─────────┐         │
│          │  HTTP    │              │  HTTP   │         │─────────┘
│ Browser  │────────► │   Gateway    │────────►│  Auth   │
│  (you)   │          │   :8000      │         │  :8001  │         │
│          │          │              │         │         │         ┌────────────┐
│          │◄─────────│  (public)    │         └─────────┘         │  Postgres  │
└──────────┘  HTTP    └──────┬───────┘                              │  (chat)    │
                            │                                      └─────▲──────┘
                            │  HTTP                                        
                            │                                                  
                            ▼                                                  
                       ┌─────────┐                                           
                       │  Chat   │──────────────────────────────────────────┘
                       │  :8002  │                                           
                       └─────────┘                                           
```

| Arrow | What it is |
|---|---|
| Browser → Gateway | Your app talks to the only public port. |
| Gateway → Auth | Gateway forwards `/api/v1/auth/*` to the auth service. |
| Gateway → Chat | Gateway forwards `/api/v1/chat/*` to the chat service, after checking who's logged in. |
| Auth → Postgres | The auth service reads/writes its own database. |
| Chat → Postgres | The chat service reads/writes its own database. |

**Key idea:** the **gateway is the only door**. Browser never talks to auth or chat directly. Auth and chat don't talk to each other.

---

## 2. Signup / signin flow

```
 Browser               Gateway                Auth                Postgres
 ──────               ───────                ────                ────────
    │                    │                     │                     │
    │  POST /auth/signin │                     │                     │
    │  { email, pwd }    │                     │                     │
    │ ─────────────────► │                     │                     │
    │                    │  forward as-is      │                     │
    │                    │ ──────────────────► │                     │
    │                    │                     │  SELECT * FROM      │
    │                    │                     │  users WHERE email  │
    │                    │                     │ ──────────────────► │
    │                    │                     │ ◄────────────────── │
    │                    │                     │  user row           │
    │                    │                     │                     │
    │                    │                     │  bcrypt.compare     │
    │                    │                     │  (password matches?)│
    │                    │                     │                     │
    │                    │                     │  jwt.sign(          │
    │                    │                     │   { sub:user.id,    │
    │                    │                     │     jti:randomUUID })│
    │                    │                     │                     │
    │                    │                     │  INSERT INTO        │
    │                    │                     │  refresh_tokens     │
    │                    │                     │ ──────────────────► │
    │                    │                     │                     │
    │                    │  { user,            │                     │
    │                    │    accessToken }    │                     │
    │                    │ ◄────────────────── │                     │
    │  { user,           │                     │                     │
    │    accessToken,    │                     │                     │
    │  Set-Cookie:       │                     │                     │
    │  refreshToken=...} │                     │                     │
    │ ◄───────────────── │                     │                     │
    │                    │                     │                     │
    │  (browser stores   │                     │                     │
    │   accessToken in   │                     │                     │
    │   memory, refresh  │                     │                     │
    │   in HttpOnly      │                     │                     │
    │   cookie)          │                     │                     │
```

| Step | Plain English |
|---|---|
| `POST /auth/signin` | The browser sends email + password. |
| Gateway forwards | The gateway doesn't change anything for `/auth/*`. |
| `SELECT user by email` | Auth service looks up the user. |
| `bcrypt.compare` | Checks the password against the stored hash. |
| `jwt.sign` | Creates a signed token. `sub` = user ID, `jti` = random ID for this specific token. |
| `INSERT refresh_tokens` | Saves a long-lived refresh token (30 days) in the DB. |
| `Set-Cookie: refreshToken` | The browser stores the refresh token in an HttpOnly cookie — JS can't read it, so XSS can't steal it. |
| `accessToken` in body | The browser keeps this in memory and sends it on every later request. |

**Two tokens, two jobs:**

| Token | Lifespan | Storage | Job |
|---|---|---|---|
| `accessToken` (JWT) | 15 min | Browser memory | "I am user X" on every request |
| `refreshToken` (random) | 30 days | HttpOnly cookie | "Get me a new access token when the old one expires" |

---

## 3. Sending a chat message (the full path)

```
 Browser              Gateway                Chat                Postgres
 ──────              ───────                ────                ────────
    │                   │                     │                     │
    │  POST /chat/      │                     │                     │
    │  conversations/   │                     │                     │
    │  abc/messages     │                     │                     │
    │  Authorization:   │                     │                     │
    │  Bearer <token>   │                     │                     │
    │ ────────────────► │                     │                     │
    │                   │  1. jwt.verify      │                     │
    │                   │     (token,         │                     │
    │                   │      JWT_SECRET)    │                     │
    │                   │     ───► payload    │                     │
    │                   │         { sub, jti }│                     │
    │                   │                     │                     │
    │                   │  2. Redis: is       │                     │
    │                   │     this jti        │                     │
    │                   │     revoked?        │                     │
    │                   │     (no)            │                     │
    │                   │                     │                     │
    │                   │  3. req.user =      │                     │
    │                   │     { id: sub,      │                     │
    │                   │       jti }         │                     │
    │                   │                     │                     │
    │                   │  4. proxy kicks in: │                     │
    │                   │     set x-user-id   │                     │
    │                   │     = req.user.id   │                     │
    │                   │     set x-user-jti  │                     │
    │                   │     = req.user.jti  │                     │
    │                   │                     │                     │
    │                   │  POST /chat/        │                     │
    │                   │  conversations/     │                     │
    │                   │  abc/messages       │                     │
    │                   │  x-user-id: <sub>   │                     │
    │                   │ ──────────────────► │                     │
    │                   │                     │  5. requireGateway- │
    │                   │                     │     User middleware:│
    │                   │                     │     reads x-user-id │
    │                   │                     │     req.user = {    │
    │                   │                     │       id, jti }     │
    │                   │                     │                     │
    │                   │                     │  6. Zod validates   │
    │                   │                     │     URL params      │
    │                   │                     │     (abc is UUID?)  │
    │                   │                     │                     │
    │                   │                     │  7. Zod validates   │
    │                   │                     │     body            │
    │                   │                     │     (content given?)│
    │                   │                     │                     │
    │                   │                     │  8. SELECT conv     │
    │                   │                     │     WHERE id=abc    │
    │                   │                     │     AND user_id=    │
    │                   │                     │     req.user.id     │
    │                   │                     │ ──────────────────► │
    │                   │                     │ ◄────────────────── │
    │                   │                     │  (row found)        │
    │                   │                     │                     │
    │                   │                     │  9. INSERT message  │
    │                   │                     │ ──────────────────► │
    │                   │                     │ ◄────────────────── │
    │                   │                     │  message row        │
    │                   │                     │                     │
    │  201 { message }  │                     │                     │
    │ ◄──────────────── │ ◄────────────────── │                     │
```

| Step # | What it does | Why |
|---|---|---|
| 1 | `jwt.verify` checks the signature with the shared secret. | Tells us the token wasn't tampered with. |
| 2 | Redis lookup for `jti` in the blocklist. | Lets us kill a specific token without re-signing everything. |
| 3 | Stash user info on `req.user`. | The proxy will read it in step 4. |
| 4 | Copy user id into `x-user-id` header on the outgoing request. | The chat service can't read `req.user` (different process). Headers are how two services pass data. |
| 5 | Chat reads `x-user-id` and stashes on its own `req.user`. | Now chat's controller has the user. |
| 6 | Zod checks the URL. | Stops garbage like `/conversations/!!!/messages` early. |
| 7 | Zod checks the body. | Stops empty/malformed messages early. |
| 8 | Look up the conversation, scoped to *this* user. | If someone else's `abc` is requested, this returns nothing — no information leak. |
| 9 | Insert the message. | The actual write. |

---

## 4. Where the user identity comes from (one more time, slowly)

```
 DB                Auth              Browser           Gateway              Chat
 ──                ────              ──────            ───────              ────
 users.id   ──►  jwt.sign({ sub:  ──►  accessToken
 (UUID)           user.id })        in memory
                                       │
                                       │  every later request:
                                       │  Authorization: Bearer <token>
                                       ▼
                                   jwt.verify
                                   payload.sub
                                   = original user.id
                                       │
                                       │  forwardUserHeaders:
                                       │  x-user-id: payload.sub
                                       ▼
                                   Chat reads x-user-id
                                   = same user.id from DB
```

The user ID never comes from the client. It's:
- Created in the DB at signup.
- Put into the JWT by the auth service.
- Verified by the gateway.
- Forwarded to chat as a header.
- Used by chat as the owner of any row it writes.

Same value, five hops, all server-to-server. The client only sees the opaque token.

---

## 5. The trust boundary

```
 INTERNET                          YOUR NETWORK (private)
 ─────────                         ──────────────────────

 ┌──────────┐                      ┌──────────────────────────────────┐
 │          │   only this port     │  Gateway    :8000  (public)     │
 │ Browser  │ ───────────────────► │ ─┬──────────────────────────┐  │
 │          │                      │  │                          │  │
 └──────────┘                      │  ▼                          ▼  │
                                   │ ┌─────────┐              ┌──────┐│
                                   │ │  Auth   │              │ Chat ││
                                   │ │  :8001  │              │:8002 ││
                                   │ └─────────┘              └──────┘│
                                   │  (private — only gateway  │     │
                                   │   can reach these ports)  │     │
                                   └──────────────────────────────────┘
```

- The gateway is the **only** public face.
- Chat and auth run on private ports.
- Chat trusts the `x-user-id` header **because nothing else can reach it.**
- If you expose chat's port to the internet, anyone can `curl -H "x-user-id: <any-uuid>"` and become that user. The proxy isn't decoration — it's the security model.

---

## 6. Database tables

```
 AUTH DB                              CHAT DB
 ───────                              ───────
                                       ┌──────────────────────┐
 ┌────────────────────┐                │  conversations       │
 │  users             │                │ ──────────────────── │
 │ ────────────────── │                │  id          UUID PK │
 │  id          UUID  │   user_id ─────│  user_id     UUID    │
 │  email       TEXT  │                │  agent_id    UUID    │
 │  name        TEXT  │                │  title       TEXT    │
 │  password_hash     │                │  created_at  TIMESTAMP│
 │  created_at        │                └──────────┬───────────┘
 │  updated_at        │                           │ 1:N
 └────────────────────┘                           │
                                                  ▼
 ┌────────────────────┐                ┌──────────────────────┐
 │  refresh_tokens    │                │  messages            │
 │ ────────────────── │                │ ──────────────────── │
 │  token       TEXT  │                │  id              UUID│
 │  user_id     UUID  │                │  conversation_id UUID│
 │  expires_at       │                │  role   ENUM(u, a)   │
 └────────────────────┘                │  content       TEXT  │
                                       │  created_at          │
                                       └──────────────────────┘
```

| Table | What it stores |
|---|---|
| `users` | The actual accounts. Source of truth for "who you are." |
| `refresh_tokens` | Long-lived secrets tied to a user. Killed on logout. |
| `conversations` | One row per chat. `user_id` is the owner. `agent_id` is currently a placeholder for "the single AI." |
| `messages` | Belongs to a conversation. Cascade-deleted when the conversation is deleted. |

---

## 7. What the code does (in one breath)

```
Browser signin
   → Auth signs JWT, sends back accessToken + refresh cookie
   → Browser stores both

Browser sends chat message
   → Gateway: jwt.verify, check Redis blocklist, attach req.user
   → Gateway proxy: write x-user-id header
   → Chat: read header, Zod validate body, SELECT conversation scoped to user, INSERT message
   → Reply with the saved row
```

That's the whole system in seven lines. Everything else is plumbing.