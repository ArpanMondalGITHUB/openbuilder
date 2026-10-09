# Auth Service

Express auth service for signup, signin, refresh tokens, logout, and the current user endpoint.

## Run Locally

Run these commands from the auth service folder:

```powershell
cd backend/services/auth
npm install
```

Create a `.env` file with the required values:

```env
DATABASE_URL="your_prisma_cloud_postgres_url"
JWT_SECRET="your_jwt_secret"
PORT=8001
```

Migrate the auth tables:

```powershell
npm run migrate
```

This runs the SQL migrations in `db/migrations` and creates the `users` and `refresh_tokens` tables. If `DATABASE_URL` points to Prisma Cloud, you can see those tables there after the migration finishes.

Start the auth server:

```powershell
npm run dev
```

By default the auth service runs on `http://localhost:8001`.

## Gateway Proxy

Auth routes are normally called through the gateway at `http://localhost:8000/api/v1/auth/...`.

In `backend/gateway/index.ts`, keep this resolver on the auth proxy so the gateway forwards the full auth path to this service:

```ts
app.use("/api/v1/auth", proxy(authServiceUrl, {
  proxyReqPathResolver: (req) => `/api/v1/auth${req.url}`,
}));
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
curl.exe -X POST http://localhost:8000/api/v1/auth/signup `
  -H "Content-Type: application/json" `
  -d '{"name":"John","email":"john@example.com","password":"Password123"}'
```

### Signin

```powershell
curl.exe -X POST http://localhost:8000/api/v1/auth/signin `
  -H "Content-Type: application/json" `
  -d '{"email":"john@example.com","password":"Password123"}'
```

### Refresh Token

```powershell
curl.exe -X POST http://localhost:8000/api/v1/auth/refresh-token `
  -H "Content-Type: application/json" `
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```

### Current User

```powershell
curl.exe -X GET http://localhost:8000/api/v1/auth/me `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Logout

```powershell
curl.exe -X POST http://localhost:8000/api/v1/auth/logout `
  -H "Content-Type: application/json" `
  --cookie "refreshToken=YOUR_REFRESH_TOKEN"
```

## Other Commands

Run from `backend/services/auth`:

```powershell
npm run migrate:down
```

This rolls back the latest auth migration.
