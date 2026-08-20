# Healthcare Appointment & Follow-up Manager

A clinic platform with separate patient, doctor, and admin portals: patients book appointments and share symptoms in advance, doctors get an AI pre-visit summary and give patients an AI-generated post-visit summary, and both sides get email + Google Calendar updates.

- Backend: Node.js + Express + PostgreSQL (Prisma ORM)
- Frontend: React + Vite, plain CSS
- LLM: pluggable (Anthropic / OpenAI / a no-key `mock` provider for local testing)
- Background jobs: `node-cron` (notification retry, medication reminders)

See [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for the design write-up (double-booking prevention, leave conflict handling, slot hold mechanism, notification failure handling).

## Project layout

```
backend/    Express API, Prisma schema + migrations, background jobs
frontend/   React app (patient / doctor / admin portals)
docker-compose.yml   Local Postgres for development
```

## Setup

### 1. Database

A local Postgres is provided via Docker:

```bash
docker-compose up -d db
```

This starts Postgres on `localhost:5544` (user `hca`, password `hca_dev_password`, db `hca`). If you'd rather use your own Postgres instance (or a hosted one for deployment), just point `DATABASE_URL` at it instead.

### 2. Backend

```bash
cd backend
cp .env.example .env      # fill in JWT_SECRET at minimum; see below for the rest
npm install
npm run prisma:migrate    # applies all migrations
npm run prisma:seed       # creates the initial admin account
npm run dev                # http://localhost:4000
```

The seed script creates `admin@hca-clinic.example` / `admin12345` (override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` env vars before seeding). Log in as admin to create doctor accounts — doctors don't self-register.

Run the test suite (includes a concurrency test that fires 5 simultaneous booking requests at the same slot):

```bash
npm test
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # points at the backend API
npm install
npm run dev                # http://localhost:5173
```

## Environment variables (`backend/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | Signs auth tokens — set to a long random string |
| `LLM_PROVIDER` | `anthropic`, `openai`, or `mock` (canned responses, no key needed — good for local dev/grading without API costs) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Used when `LLM_PROVIDER=anthropic` |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | Used when `LLM_PROVIDER=openai` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Outgoing email. **If `SMTP_HOST` is left blank**, emails are rendered and logged to the console instead of sent — the whole notification pipeline is exercisable with zero email setup |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Google Calendar OAuth (optional — see below) |
| `BOOKING_HOLD_MINUTES` | How long a slot hold lasts before it's free again (default 5) |
| `NOTIFICATION_MAX_RETRIES` | Cap on retry attempts per notification (default 5) |
| `NOTIFICATION_POLL_CRON` / `REMINDER_POLL_CRON` | Cron expressions for the two background jobs |

## Google Calendar setup

Calendar sync is optional — booking works fully without it, and any user who hasn't connected Calendar is silently skipped (not an error). To enable it:

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (or use an existing one) and enable the **Google Calendar API**.
2. Configure the OAuth consent screen (External is fine for testing; add your test users' emails).
3. Create an **OAuth 2.0 Client ID** (type: Web application). Add an authorized redirect URI matching `GOOGLE_REDIRECT_URI` in your `.env` (default `http://localhost:4000/api/calendar/oauth/callback`).
4. Copy the client ID/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
5. In the app, an authenticated user calls `GET /api/calendar/oauth/url` to get the Google consent URL, completes consent, and is redirected back — their refresh token is stored and calendar events are created/updated/deleted automatically from then on.

## LLM prompts

**Pre-visit summary** (`src/services/llm/llm.service.js: generatePreVisitSummary`), run when a patient confirms a booking:

> Analyse these symptoms and return a JSON object with exactly these keys: "urgency" (one of "Low", "Medium", "High"), "chiefComplaint" (a short string), and "suggestedQuestions" (an array of exactly 3 short questions the doctor should ask the patient). Respond with ONLY the JSON object — no markdown, no explanation.
>
> Symptoms: `<symptoms>`

**Post-visit summary** (`generatePostVisitSummary`), run when a doctor submits visit notes:

> Convert these clinical notes into a JSON object with exactly these keys: "summary" (a short patient-friendly paragraph explaining the visit in plain language), "medicationSchedule" (an array of strings, each describing one medication and when to take it), and "followUpSteps" (an array of short follow-up instructions). Respond with ONLY the JSON object — no markdown, no explanation.
>
> Clinical notes: `<notes>`

Both calls run **after** their triggering DB transaction commits (never inside it) and are wrapped in a timeout + try/catch. On failure the row is left with `llmStatus: FAILED` and the raw input intact — booking and visit completion always succeed regardless of LLM availability.

## Database schema

Defined in [`backend/prisma/schema.prisma`](./backend/prisma/schema.prisma). Key models:

- **User** — patient/doctor/admin, role-based auth
- **DoctorProfile** / **DoctorLeave** — specialisation, working hours (JSON per weekday), slot duration, leave days
- **Appointment** — `HELD → CONFIRMED → COMPLETED`, or a cancelled/expired terminal state. A partial unique index on `(doctorId, slotStart)` for `HELD`/`CONFIRMED` rows is the double-booking guard (see `prisma/migrations/20260820073458_add_active_slot_unique_index`)
- **SymptomForm** / **VisitNote** — LLM inputs/outputs, each with an `llmStatus` (`OK`/`FAILED`/`PENDING`)
- **MedicationReminder** — one row per prescribed medication; `nextSendAt`/`remainingDoses` advance each time the reminder job fires
- **NotificationLog** — every email and calendar action, `PENDING → SENT` or `FAILED` with `retryCount`; the single queue both background jobs feed and the worker drains
- **GoogleOAuthToken** / **CalendarEvent** — per-user OAuth tokens and the calendar events created on their behalf

## API overview

All endpoints are under `/api` and require `Authorization: Bearer <token>` except `POST /api/auth/register`, `POST /api/auth/login`, and the Calendar OAuth callback.

| Method & path | Role | Purpose |
|---|---|---|
| `POST /auth/register` | — | Patient self-registration |
| `POST /auth/login` | — | Login (any role) |
| `POST /admin/doctors` | admin | Create a doctor account + profile |
| `GET /admin/doctors` | admin | List doctors |
| `PATCH /admin/doctors/:id` | admin | Update specialisation/hours/slot duration |
| `POST /admin/doctors/:id/leave` | admin | Mark a leave day (cancels conflicting bookings) |
| `DELETE /admin/doctors/:id/leave/:leaveId` | admin | Remove a leave day |
| `GET /doctors` | any | Search doctors, optional `?specialisation=` |
| `GET /appointments/slots?doctorId=&date=` | any | Available slots for a date |
| `POST /appointments/hold` | patient | Reserve a slot (short TTL) |
| `POST /appointments/:id/confirm` | patient | Submit symptoms + confirm (triggers pre-visit LLM summary) |
| `POST /appointments/:id/cancel` | patient/admin | Cancel |
| `GET /appointments/mine` | patient | My appointments |
| `GET /appointments/doctor/mine` | doctor | My appointments |
| `POST /visits/:appointmentId` | doctor | Submit notes + prescription (triggers post-visit LLM summary, creates reminders) |
| `GET /visits/:appointmentId` | patient/doctor | View visit note / summary |
| `GET /calendar/oauth/url` | any | Get Google consent URL |
| `GET /calendar/status` | any | Whether Calendar is connected |
| `DELETE /calendar/disconnect` | any | Disconnect Calendar |

## Deployment

- **Backend**: `render.yaml` at the repo root is a Render blueprint (Node web service + free Postgres, runs `prisma migrate deploy` on start). Any other Node host with a Postgres add-on (Railway, Fly.io) works the same way: set the env vars above, run `npx prisma migrate deploy` once against the production DB, then `npm start`.
- **Frontend**: `frontend/vercel.json` adds the SPA rewrite Vercel needs for client-side routing. Any static host (Vercel, Netlify, Render static site) works — set `VITE_API_URL` to the deployed backend's URL and run `npm run build`; deploy the `dist/` output.
