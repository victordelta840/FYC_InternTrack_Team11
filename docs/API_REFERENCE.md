# API Reference (v1)

Base URL: `http://localhost:4000/api/v1`

Auth: `Authorization: Bearer <accessToken>` (except explicitly public endpoints).

## Auth
| Method | Path                | Auth   | Notes                                          |
|--------|---------------------|--------|------------------------------------------------|
| POST   | `/auth/login`       | public | Student / Mentor login gateway.                |
| POST   | `/auth/admin/login` | public | Admin-only gateway (rejects non-ADMIN users).  |
| POST   | `/auth/register`    | public | Student self-registration.                     |
| POST   | `/auth/refresh`     | public | Rotates access + refresh (HTTP-only cookie).   |
| POST   | `/auth/logout`      | JWT    | Revokes the refresh fingerprint.               |
| GET    | `/auth/me`          | JWT    | Current user profile.                          |

### Login response
```json
{
  "accessToken": "eyJhbGci...",
  "accessExpiresIn": 900,
  "user": { "id": "...", "email": "...", "role": "STUDENT", "firstName": "Rahul", "lastName": "Kumar" }
}
```

## Users (ADMIN)
- `GET  /users?role=STUDENT|MENTOR|ADMIN`
- `GET  /users/:id`
- `POST /users` — create with role.
- `PATCH /users/:id/status` — `{ "active": true|false }`.

## Internships
- `GET  /internships` — scoped to current user.
- `GET  /internships/:id`
- `POST /internships` (ADMIN) — `{ title, organization, startDate, endDate, totalDays, mentorIds, studentIds }`
- `PATCH /internships/:id/status` (ADMIN)

## Attendance
- `POST  /attendance/mark` (MENTOR/ADMIN) — `{ internshipId, studentId, date, status, notes? }`
- `PATCH /attendance/:id` (MENTOR/ADMIN) — `{ status, justification (min 5), notes? }`
- `GET   /attendance/internship/:id`
- `GET   /attendance/roster/:id` — per-student totals + precision %.
- `GET   /attendance/student/:studentId/stats?internshipId=...`
- `POST  /attendance/import/preview` — multipart `file` + `internshipId`, returns `StagingResult`.
- `POST  /attendance/import/commit` — `{ internshipId, staging }`.

## Templates (ADMIN)
- `GET   /templates`
- `GET   /templates/active` (any role)
- `POST  /templates/upload` — multipart `file` + `name`. Runs local OCR heuristic.
- `PATCH /templates/:id/mapping` — `{ fields: [{ key,x,y,width,height,fontSize,fontColor,align,page }] }`
- `PATCH /templates/:id/activate` — exactly one active template.
- `GET   /templates/:id/file` — raw file bytes (used by the mapper).

## Certificates
- `GET  /certificates/precheck?studentId=&internshipId=` — returns eligibility + threshold + shortfall math.
- `POST /certificates/issue` (ADMIN/MENTOR) — `{ studentId, internshipId }`.
- `POST /certificates/self-issue` (STUDENT) — `{ internshipId }`.
- `GET  /certificates/mine` (STUDENT).
- `GET  /certificates` (ADMIN).
- `GET  /certificates/:id/download` — streams the local PDF.

### 90.00% enforcement — Error payload
```http
HTTP/1.1 400 Bad Request
```
```json
{
  "statusCode": 400,
  "code": "ATTENDANCE_BELOW_THRESHOLD",
  "message": "Attendance does not meet the required threshold for certificate issuance.",
  "details": {
    "currentPercentage": "89.99",
    "requiredPercentage": "90.00",
    "shortfall": "0.01"
  }
}
```

## Complaints
State machine: `OPEN → IN_REVIEW → RESOLVED → CLOSED` (or `→ ESCALATED` from OPEN/IN_REVIEW via SLA cron or admin).

- `POST  /complaints` (STUDENT) — `{ category, subject, description, assignedTo?, slaHours? }`
- `GET   /complaints?status=OPEN|IN_REVIEW|ESCALATED|RESOLVED|CLOSED` — role-scoped view.
- `GET   /complaints/:id`
- `PATCH /complaints/:id/status` (MENTOR/ADMIN) — `{ status, resolutionNotes? (min 5 when RESOLVED) }`
- `PATCH /complaints/:id/assign` (ADMIN) — `{ assigneeId }`

**SLA cron** runs every 10 min. Any complaint with `status ∈ {OPEN, IN_REVIEW}` and `sla_breach_at ≤ now` is auto-transitioned to `ESCALATED` and reassigned to the earliest active admin.

## Webhooks (ADMIN)
Broadcast HMAC-signed events to external subscribers. Delivery via MySQL-backed `system_jobs` queue with truncated exponential backoff.

- `GET  /webhooks`
- `POST /webhooks` — `{ name, targetUrl, events[] }`. Returns the raw `secretKey` **once**.
- `PATCH /webhooks/:id` — patch `name`, `targetUrl`, `events`, `isActive`.
- `POST /webhooks/:id/rotate-secret` — returns the new `secretKey` once.
- `GET  /webhooks/:id/deliveries` — job history (status, attempts, sanitized errors).
- `POST /webhooks/deliveries/:jobId/retry` — resets a failed job to `PENDING`.
- `DELETE /webhooks/:id` — soft delete.

Emitted events: `student.registered`, `certificate.generated`, `complaint.created`, `complaint.in_review`, `complaint.escalated`, `complaint.resolved`, `complaint.closed`, `complaint.reassigned`.

### Signature scheme
```
X-Webhook-Event:     complaint.escalated
X-Webhook-Timestamp: 1706003912
X-Webhook-Signature: sha256=<hex>
X-Webhook-Id:        <webhook uuid>
```
Verify on your receiver:
```ts
const expected = crypto
  .createHmac('sha256', secret)
  .update(`${headers['x-webhook-timestamp']}.${rawBody}`)
  .digest('hex');
if (!crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(sig,'hex'))) reject();
if (Math.abs(Date.now()/1000 - Number(headers['x-webhook-timestamp'])) > 300) reject(); // replay guard
```
