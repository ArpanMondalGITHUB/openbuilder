# Auth Service

Express auth service for signup, signin, refresh tokens, logout, `/me`, Postgres-backed users, and Redis-backed auth cache/session invalidation.

## What Changed

- Controllers now use `try/catch` and pass errors to the shared `errorHandler`.
- `signin` stores the safe user payload in Redis as `auth:user:<userId>` for 15 minutes.
- `/me` checks Redis first, then falls back to Postgres.
- `logout` deletes the cached user and blacklists the current access token.
- Access tokens now include a `jti`, so a logged-out token can be blocked until it expires.
- Refresh tokens are stored hashed in Postgres.
- `index.ts` loads `.env` first with `import "dotenv/config";`.
- Auth config values live in `config/auth.config.ts`; app code should prefer `config.*` over direct `process.env.*`.

## Behavior To Know

- Redis is optional for startup. If `REDIS_URL` is missing, auth still runs, but caching and access-token blacklist are disabled.
- Logout now requires an `Authorization: Bearer <accessToken>` header. Without it, the route returns `401`.
- If Redis is down during logout, the refresh token can still be deleted, but the access token may keep working until its normal 15 minute expiry.
- `signup` does not use Redis.
- `refresh-token` does not use Redis right now.

## Run Locally

From the auth service folder:

```powershell
cd backend/services/auth
npm install
```

Create `backend/services/auth/.env`:

```env
DATABASE_URL="your_postgres_url"
JWT_SECRET="your_jwt_secret"
REDIS_URL="redis://localhost:6379"
PORT=8001
```

Optional env values:

```env
CORS_ORIGIN="http://localhost:5173"
DB_SSL_INSECURE="true"
NODE_ENV="development"
```

Start Redis from `backend`:

```powershell
cd backend
docker compose up -d redis
```

For local dev, prefer binding Redis to localhost in `backend/docker-compose.yml`:

```yml
ports:
  - "127.0.0.1:6379:6379"
```

Run migrations:

```powershell
cd backend/services/auth
npm run migrate
```

Start auth:

```powershell
npm run dev
```

Expected startup:

```text
redis connected
auth start to listning on PORT 8001
```

If you see this, Redis is disabled:

```text
REDIS_URL is not defined; Redis is disabled
```

## Config Rule

Keep this as the first line of `index.ts`:

```ts
import "dotenv/config";
```

That loads `.env` before routes/controllers/config are imported.

Use `config.*` in auth code:

```ts
config.port
config.jwtSecret
config.databaseUrl
config.dbSslInsecure
config.redisUrl
```

Avoid direct `process.env.*` outside config setup and tests.

## Gateway Proxy

Auth routes are normally called through the gateway:

```text
http://localhost:8000/api/v1/auth/...
```

Gateway `.env` example:

```env
PORT=8000
AUTH_SERVICE=http://localhost:8001
FRONTEND_URL=http://localhost:5173
```

Run the gateway from `backend/gateway`:

```powershell
npm run dev
```

## API Examples

### Signup

```powershell
curl -X POST http://localhost:8000/api/v1/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"dawn","email":"dawn@example.com","password":"Password12345678"}'
```

### Signin

Save the returned `accessToken`. The server also sets an HTTP-only `refreshToken` cookie.

```powershell
curl -i -X POST http://localhost:8000/api/v1/auth/signin `
  -H "Content-Type: application/json" `
  -d '{"email":"dawn@example.com","password":"Password12345678"}'
```

Redis effect:

```text
SET auth:user:<userId> ... EX 900
```

### Current User

```powershell
curl -X GET http://localhost:8000/api/v1/auth/me `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Redis effect:

```text
GET auth:access-token:<jti>
GET auth:user:<userId>
```

### Refresh Token

```powershell
curl -X POST http://localhost:8000/api/v1/auth/refresh-token `
  -H "Content-Type: application/json" `
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```

### Logout

Logout needs both the bearer token and the refresh token cookie:

```powershell
curl -X POST http://localhost:8000/api/v1/auth/logout `
  -H "Content-Type: application/json" `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" `
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```

Redis effect:

```text
GET auth:access-token:<jti>
SET auth:access-token:<jti> 1 EX <seconds-left>
DEL auth:user:<userId>
```

## Prove Redis Is Working

Watch Redis commands:

```powershell
cd backend
docker compose exec redis redis-cli MONITOR
```

Then call `signin`, `/me`, and `logout` from another terminal.

Check keys:

```powershell
docker compose exec redis redis-cli KEYS "auth:*"
```

Check expiry:

```powershell
docker compose exec redis redis-cli TTL "auth:user:USER_ID_HERE"
```

Expected TTL is near `900` seconds after signin.

Do not leave `MONITOR` running in production.

## Commands

Run from `backend/services/auth`:

```powershell
npm run dev
npm test
npm run migrate
npm run migrate:down
```

Type-check:

```powershell
npx tsc --noEmit
```

## What Breaks If Wrong

- Missing `JWT_SECRET`: auth service crashes on startup.
- Missing `DATABASE_URL`: auth service crashes when config loads.
- Missing `REDIS_URL`: auth starts, but Redis cache and logout blacklist are disabled.
- Missing bearer token on `/logout`: logout returns `401`.
- Redis exposed as `6379:6379`: Redis may accept traffic from outside your machine. Use `127.0.0.1:6379:6379` for local dev.
- Sending HTTP traffic to Redis port `6379`: Redis logs `Possible SECURITY ATTACK detected`.
