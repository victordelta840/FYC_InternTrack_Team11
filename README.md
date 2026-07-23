# InternTrack Enterprise Edition

Production-ready internship management platform built for local, offline, self-hosted operation on **XAMPP (Apache + MySQL 8)**.

## Highlights
- **Backend:** NestJS 10 + TypeScript + TypeORM + MySQL 8
- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + PWA + Zustand + React Query
- **Auth:** RS256 JWT (asymmetric) + HTTP-Only refresh tokens + Argon2id password hashing
- **Storage:** Local filesystem (no S3)
- **Queue:** MySQL-backed `system_jobs` table + polling worker (no Redis)
- **AI:** Local `tesseract.js` OCR + drag-drop canvas fallback (no OpenAI / Vision APIs)
- **PDF:** `pdf-lib` (fully local)
- **Security:** Helmet, CSRF, CORS, rate limiting, audit log interceptor, immutable audit trail
- **Business Rules:**
  - Attendance = `(Present Days / Total Internship Days) * 100` with `DECIMAL(5,2)` precision
  - Certificate issue threshold: **>= 90.00%** (89.99% is a hard block)
  - 48h SLA escalation for open complaints
  - Attendance revisions logged in lineage table

## Folder Layout
```
/interntrack-enterprise
  /backend        # NestJS API
  /frontend       # Next.js PWA
  /docs           # README.md, API_REFERENCE.md, SETUP_XAMPP.md, ARCHITECTURE.md
```

## Quick Start
1. `docs/SETUP_XAMPP.md` — start Apache + MySQL from XAMPP control panel.
2. Create the DB: `interntrack_db` (see `docs/SETUP_XAMPP.md`).
3. `cd backend && cp .env.example .env && npm install && npm run keys:generate && npm run migration:run && npm run seed && npm run start:dev`
4. `cd frontend && cp .env.example .env.local && npm install && npm run dev`
5. Open `http://localhost:3001` (frontend) — API is on `http://localhost:4000/api/v1`.

## Seeded Accounts (after `npm run seed`)
| Role    | Email                       | Password        |
|---------|-----------------------------|-----------------|
| Admin   | admin@interntrack.local     | Admin@12345     |
| Mentor  | mentor@interntrack.local    | Mentor@12345    |
| Student | student1@interntrack.local  | Student@12345   |
| Student | student2@interntrack.local  | Student@12345   |

## Documentation
- [Setup XAMPP](docs/SETUP_XAMPP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API_REFERENCE.md)

## License
Proprietary — InternTrack Enterprise Edition.
