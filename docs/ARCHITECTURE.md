# Architecture

## Overview
Modular Monolith. NestJS backend + Next.js PWA frontend, backed by MySQL 8, running fully self-hosted on XAMPP.

```
┌────────────────────────────────────────────────────────────────────┐
│                       Next.js 14 (App Router, PWA)                 │
│  /auth/login  /admin/login  /student  /mentor  /admin  …           │
└────────────────┬────────────────────────────┬──────────────────────┘
                 │ RS256 JWT (Bearer)         │ HTTP-only refresh cookie
                 ▼                            ▼
┌────────────────────────────────────────────────────────────────────┐
│                        NestJS 10 (TypeScript)                       │
│  auth · users · internships · attendance · templates · certificates│
│  common (guards, filters, audit interceptor, decimal utils)        │
│                                                                    │
│  MySQL-backed job table (system_jobs) — TypeORM polling worker     │
│  Local filesystem storage (templates/, certificates/, uploads/)    │
│  tesseract.js local OCR + drag-drop canvas mapping fallback        │
└────────────────────────────┬───────────────────────────────────────┘
                             ▼
                   MySQL 8 (interntrack_db)
```

## Domain modules
- **auth** — RS256 JWT, gateway isolation (`ADMIN` vs `PORTAL`), Argon2id, refresh rotation, lockouts.
- **users** — Admin-only CRUD.
- **internships** — Assign mentors + enroll students in transactions.
- **attendance** — Manual entry + CSV/XLSX import (staging preview), lineage revisions.
- **templates** — Local tesseract.js OCR + drag-drop canvas fallback + encrypted `mapping_config`.
- **certificates** — Precision 90.00% rule + pdf-lib rendering.

## Precision math
Attendance % uses `decimal.js` with `ROUND_HALF_UP` and `DECIMAL(5,2)` in DB:
- `PRESENT` = 1.0, `HALF_DAY` = 0.5, `ABSENT` = 0.0
- `%  = ( Σeffective / totalDays ) * 100`
- Stored + compared as strings. `89.99 < 90.00` is a hard block.

## Security posture
- **Passwords** hashed with Argon2id (`memoryCost 19456`).
- **Access token** — RS256, 15 min TTL, `iss` / `aud` claims.
- **Refresh token** — RS256, 7 day TTL, sha256 fingerprint stored + revoked on rotation.
- **Cookies** — HTTP-Only, SameSite=Strict, Secure in production.
- **Rate limiting** — global default + tighter on login endpoints.
- **Audit log** — immutable table populated by NestJS interceptor for every mutation.
- **Attendance revisions** — mandatory justification, IP capture, before/after status.

## Storage layout
```
backend/
  keys/
    jwt-private.pem
    jwt-public.pem
  storage/
    templates/        # Uploaded certificate templates (PDF/PNG/JPG)
    certificates/     # Generated PDFs
    uploads/          # Temporary import files (multer)
```

## Job queue (Redis-free)
`system_jobs` table with statuses `PENDING | PROCESSING | FAILED | COMPLETED`. A NestJS polling worker with configurable interval + concurrency picks pending jobs, wraps them in ACID transactions, retries up to `maxAttempts`, and stores sanitized stack traces on failure.

## Roadmap (P1 not shipped in v1.0)
- Complaints / SLA cron escalation (schema + entities are ready).
- Outbound webhook broadcaster (`webhooks` table already indexed).
- CQRS analytics pipeline for admin dashboards.
- E2E Playwright suite.
