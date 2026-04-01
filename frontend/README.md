# NetWatcher Frontend

Next.js frontend for `NetWatcher`, now positioned as the primary UI while keeping the Go backend in place for auth, probes, history, alerts, and health.

## Stack

- `Next.js`
- `TypeScript`
- `Tailwind CSS`
- `Zustand`
- `TanStack Query`
- `React Hook Form`
- `Zod`

## Current scope

This first migration slice already includes:

- auth pages:
  - `/login`
  - `/signup`
  - `/verify-email`
  - `/forgot-password`
  - `/reset-password`
- protected pages:
  - `/` with runtime, alert, target health, activity feed, and recent telemetry overview
  - `/icmp-ping`
  - `/tcp-ping`
  - `/port-scan`
  - `/dns-lookup` with advanced DNS inspection
  - `/history` with query + export
  - `/alerts` with list/create/edit/delete
  - `/profile` with account + recovery actions
  - `/settings` with runtime health + dependency status
- proxy route handlers for the existing Go API

The Go backend remains the source of truth for auth, probes, history, alerts, and health checks.

## Why the proxy layer exists

The Go backend currently enforces same-origin checks. During migration, the Next app runs on a separate port, so the frontend proxies requests through:

- `src/app/api/[...path]/route.ts`
- `src/app/api/healthz/route.ts`

That keeps the backend unchanged while allowing local Next development.

## Local run

Use this only if you want to develop the Next app locally.

1. Start the Go backend on `http://127.0.0.1:8080`
2. Copy the frontend env file
3. Start the Next dev server

```powershell
cd d:\NetWatcher\frontend
Copy-Item .env.example .env.local -Force
pnpm install
pnpm dev
```

For websocket-based realtime probes during local development, start the Go backend with:

```powershell
$env:NETWATCHER_ALLOWED_ORIGINS="http://127.0.0.1:3000,http://localhost:3000"
```

Open:

- frontend: `http://127.0.0.1:3000`
- backend health: `http://127.0.0.1:8080/healthz`

## Docker-only workflow

If you run the frontend only through Docker, you do **not** need local:

- `frontend/node_modules`
- `frontend/.next`

The Docker image installs dependencies and builds the app inside the container.

Run the production stack from the repo root:

```powershell
cd d:\NetWatcher
docker compose -f deploy/docker-compose.production.yml --env-file .env up -d --build
```

## Local production build

```powershell
cd d:\NetWatcher\frontend
pnpm build
pnpm start
```

## Production container path

The production compose stack now treats this app as the primary UI:

- `frontend/` serves the dashboard
- `cmd/netwatcher` stays behind it as the API and realtime probe backend
- `deploy/nginx.frontend-primary.conf` routes `/api`, `/healthz`, and `/ws` to Go

## Checks

Run these only for local frontend development or verification:

```powershell
pnpm lint
pnpm build
pnpm test:e2e
```

For E2E, keep the app stack running first and optionally point Playwright at a custom host:

```powershell
$env:PLAYWRIGHT_BASE_URL="http://127.0.0.1:8080"
pnpm test:e2e
```

The E2E auth flow expects signup to return `preview_code`, so for local runs use a stack with email delivery disabled:

```powershell
$env:NETWATCHER_RESEND_API_KEY=""
```

## Next migration targets

- overview chart parity with the legacy dashboard
- advanced DNS visualization polish
- finalizing remaining protected-route UX gaps
- deeper production hardening and deployment polish
