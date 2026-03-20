# Net-Watcher

Net-Watcher is a self-hosted network diagnostics toolkit built with Go. It combines a CLI, a local web server, realtime probe streaming, and production-ready infrastructure hooks for PostgreSQL/TimescaleDB, Redis, and S3-compatible object storage.

Developer: MOPARA PAIR AYAT

## Overview

Net-Watcher is designed to run in two modes:

- Lightweight local mode with SQLite
- Production mode with PostgreSQL + TimescaleDB + Redis + S3-compatible object storage

You run the server, open the dashboard in your browser, and inspect live ICMP or TCP probe results as they arrive. In production mode, the app can use:

- PostgreSQL/TimescaleDB for durable time-series history
- Redis for fast history caching
- S3-compatible object storage for exported history artifacts

Core capabilities:
- ICMP ping
- TCP ping
- Realtime WebSocket streaming
- Stop/cancel for live runs
- SQLite or PostgreSQL/TimescaleDB history
- Redis-backed history cache
- Export endpoint with optional S3 upload
- Latency chart + result table
- Scrollable live result view
- Local-first and production deployment model

## Architecture

- `cmd/netwatcher`
  CLI entrypoint and web server
- `internal/cache`
  Redis cache integration
- `internal/objectstore`
  S3-compatible object storage integration
- `internal/ping`
  ICMP ping implementation
- `internal/tcpping`
  TCP connect latency implementation
- `internal/report`
  result and summary model
- `internal/store`
  SQLite and PostgreSQL/TimescaleDB persistence, batching, retention
- `web`
  frontend assets for the dashboard
- `deploy`
  production `docker-compose` stack

## Tech Stack

- Go
- SQLite
- PostgreSQL
- TimescaleDB
- Redis
- S3-compatible object storage
- Gorilla WebSocket
- Vanilla HTML, CSS, JavaScript

## Features

### CLI

```bash
./netwatcher ping 8.8.8.8
./netwatcher tcpping example.com --port 443
```

### Web UI

- Realtime results
- Live latency chart
- History loading
- Mobile-friendly layout
- Stop button for active WebSocket runs

### API

- `POST /api/ping`
- `POST /api/tcpping`
- `GET /api/history`
- `GET /api/export/history`
- `GET /healthz`
- `GET /ws`

## Quick Start

### Windows

```powershell
go mod tidy
go build -o netwatcher.exe .\cmd\netwatcher
.\netwatcher.exe serve --listen 127.0.0.1:8080 --static .\web --db-driver sqlite --db .\netwatcher.db
```

Open:

```text
http://127.0.0.1:8080
```

### Linux

```bash
go mod tidy
go build -o netwatcher ./cmd/netwatcher
./netwatcher serve --listen 127.0.0.1:8080 --static ./web --db-driver sqlite --db ./netwatcher.db
```

Open:

```text
http://127.0.0.1:8080
```

For ICMP on Linux, root or `CAP_NET_RAW` may be required:

```bash
sudo setcap cap_net_raw+ep ./netwatcher
```

## Example API Requests

### TCP Ping

```bash
curl -X POST http://127.0.0.1:8080/api/tcpping \
  -H "Content-Type: application/json" \
  -d '{"host":"example.com","port":443,"count":4,"interval_ms":1000,"timeout_ms":2000}'
```

### History

```bash
curl "http://127.0.0.1:8080/api/history?type=tcpping&host=example.com&port=443&limit=20"
```

### Export History

Download JSON:

```bash
curl -OJ "http://127.0.0.1:8080/api/export/history?type=tcpping&host=example.com&port=443&limit=50&format=json"
```

Upload CSV to configured S3-compatible object storage:

```bash
curl "http://127.0.0.1:8080/api/export/history?type=tcpping&host=example.com&port=443&limit=50&format=csv&destination=s3"
```

## Production Stack

Recommended production stack:

- PostgreSQL + TimescaleDB
- Redis
- S3-compatible object storage

Environment variables:

```bash
NETWATCHER_DB_DRIVER=postgres
NETWATCHER_DB_DSN=postgres://netwatcher:change-me@timescaledb:5432/netwatcher?sslmode=disable
NETWATCHER_TIMESCALE=true
NETWATCHER_REDIS_ADDR=redis:6379
NETWATCHER_S3_ENDPOINT=minio:9000
NETWATCHER_S3_ACCESS_KEY=minioadmin
NETWATCHER_S3_SECRET_KEY=change-me
NETWATCHER_S3_BUCKET=netwatcher-artifacts
NETWATCHER_S3_SSL=false
```

Start the production stack:

```bash
cp .env.example .env
docker compose -f deploy/docker-compose.production.yml --env-file .env up --build
```

Health check response now includes dependency status for:

- database
- redis
- object storage

## Development

Build:

```bash
go build -o netwatcher ./cmd/netwatcher
```

Run internal tests:

```bash
go test ./internal/...
```

Run vet:

```bash
go vet ./...
```

## Notes

- This project is built for self-hosted use.
- If you expose it publicly, put a trusted reverse proxy, tunnel, or access control layer in front of it.
- Runtime artifacts such as `*.db`, `*.log`, and `*.exe` are ignored by `.gitignore`.
- WebSocket is the primary realtime path. HTTP is used as a fallback path.
- Production mode is designed around PostgreSQL/TimescaleDB + Redis + S3-compatible storage.

## Current Scope

Implemented now:
- ICMP ping
- TCP ping
- Realtime Web UI
- Realtime result streaming
- History storage
- Stop/cancel for active live runs

Planned next:
- Multi-target monitoring
- HTTP/HTTPS checks
- DNS toolkit
- Alerts
