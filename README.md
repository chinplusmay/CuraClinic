# CuraClinic

Appointment operations for independent outpatient clinics. CuraClinic sits between "booked" and
"attended": it confirms visits, fills cancelled slots from a waitlist, records attendance and
measures how much appointment capacity is leaking.

Built for a 1–5 doctor clinic where reception runs appointments by phone, WhatsApp and a paper
register. Deliberately **not** an EMR — no clinical notes, prescriptions or lab workflows.

---

## What is in this repository

| Path | Description |
| --- | --- |
| [`backend/`](backend) | Java 21 + Spring Boot 3 REST API, JWT security, Flyway schema, demo seeder |
| [`frontend/`](frontend) | Vite + React + Tailwind single-page app (marketing site and clinic workspace) |

### Screens

- **Landing page** (`/`) — positioning, the leakage problem, product capabilities, recovery workflow, metric definitions and a live demo snapshot.
- **Sign in** (`/login`) — one-click demo accounts for owner, receptionist and doctor.
- **Reception desk** (`/app`) — day KPIs, today's agenda, "needs attention" queue, cancellation recovery cards.
- **Calendar** (`/app/calendar`) — day grid with one column per doctor, blocked time off, click an open slot to book.
- **Appointments** (`/app/appointments`) — searchable register with status, channel and reminder delivery.
- **Waitlist & recovery** (`/app/waitlist`) — freed-slot recovery board with waitlist matches, and the waiting-patient list.
- **Patients** (`/app/patients`) — contact directory with visit history and no-show counts.
- **Doctors & hours** (`/app/doctors`) — weekly working hours, time-off blocks, owner-only editing.
- **Analytics** (`/app/analytics`) — no-show, cancellation, recovery, utilisation, reminder delivery, doctor and channel breakdowns.

The appointment drawer (used from the desk, calendar and register) confirms visits, records
attendance or no-shows, reschedules, cancels with a reason, sends reminders and shows the full
message and event history.

---

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | Vite 6, React 18, React Router 6, Tailwind CSS 3 |
| Backend | Java 21, Spring Boot 3.5 (Web, Data JPA, Security, Validation, Mail, Scheduling) |
| Auth | Spring Security, stateless JWT (HS384), BCrypt password hashing |
| Database | MySQL 8 |
| Migrations | Flyway |
| Mapping | Spring Data JPA / Hibernate 6 |
| Reminders | Spring `@Scheduled` dispatcher, delivery log persisted per message |

---

## Run locally

### Prerequisites

- JDK 21
- Node.js 20+ and npm
- MySQL 8 running locally

### 1. Create the database

```sql
CREATE DATABASE clinicflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Flyway creates all tables on first start.

### 2. Start the API

```bash
cd backend
./mvnw spring-boot:run        # Windows: mvnw.cmd spring-boot:run
```

The API listens on `http://localhost:8080`. Database credentials come from the environment — export
them before starting (values are never committed):

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_NAME` | `clinicflow` | Database name |
| `DB_USER` | `root` | Database user |
| `DB_PASSWORD` | *unset* | Database password (required; set it in your environment) |
| `JWT_SECRET` | development key | Replace before any real deployment |
| `JWT_TTL_MINUTES` | `720` | Token lifetime |
| `SEED_DEMO_DATA` | `true` | Seed the demo clinic when the database is empty |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` | empty | SMTP delivery. Without a host, messages are logged and recorded as delivered |
| `FRONTEND_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

### 3. Start the web app

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the Spring Boot server.

### Demo accounts

All demo users share the password `clinicflow123`:

| Role | Email |
| --- | --- |
| Clinic owner | `owner@northbridgeclinic.com` |
| Receptionist | `reception@northbridgeclinic.com` |
| Doctor | `doctor@northbridgeclinic.com` |

The seed creates **Northbridge Family Clinic** (general outpatient), three doctors with morning
and evening sessions, 40 patients and roughly six weeks of historical appointments plus upcoming
bookings, cancellations and waitlist entries. Reset it by dropping the schema and restarting:

```sql
DROP DATABASE clinicflow;
CREATE DATABASE clinicflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Set `SEED_DEMO_DATA=false` for an empty clinic.

---

## Deployment Strategies

Detailed instructions are available in [DEPLOYMENT.md](DEPLOYMENT.md). The four primary deployment strategies supported are:
1. **Executable JARs**: Run full-stack unified JAR with `java -jar backend/target/clinicflow-api-1.0.0.jar` (build using `build-all.bat` or `./build-all.sh`).
2. **Docker Containers**: Production-grade multi-stage container build and `docker compose up --build`.
3. **Traditional WAR Files**: Build with `mvn clean package -Pwar` to deploy to Tomcat/WildFly.
4. **Cloud Platform Hosting**: Deploy free on Render, Koyeb, Vercel, and TiDB Cloud Serverless MySQL.

---

### Clinic signup

A new clinic registers at `/register` on the web app: it creates the clinic row and the first
account with the `OWNER` role, then signs the owner straight in. Staff do not self-register — the
owner adds reception and doctor logins from **Team & access** (`/app/team`), and those accounts
belong to the same clinic. Only the owner can list or create staff accounts. A doctor login grants
workspace access; their calendar row, specialty and working hours are still managed under
**Doctors & hours**.

---

## Feature coverage

| Feature | Status |
| --- | --- |
| Clinic, doctor and staff accounts (membership + roles) | Built |
| Patient directory | Built |
| Doctor availability and working hours | Built |
| Appointment calendar | Built |
| Booking and rescheduling | Built |
| Appointment status tracking | Built |
| Confirmation and reminders | Built (email, logged in dev) |
| Cancellation waitlist | Built |
| Daily reception dashboard | Built |
| Appointment analytics | Built |
| Billing and payments | Not built (phase 2) |
| Public online booking page | Not built (phase 2) |
| WhatsApp / SMS provider | Not built — schema stores channel; delivery logs locally (phase 2) |

---

## Workflow rules

**Booking.** A time must fall on the doctor's working-hours grid for that weekday, must not
overlap a time-off block or another active appointment, and must be in the future. The slot
length comes from the doctor's schedule (20 minutes in the demo). Conflicting bookings return
HTTP 409.

**Statuses.** `SCHEDULED → CONFIRMED → COMPLETED`, or `NO_SHOW`, or `CANCELLED`. Attendance can
only be recorded after the visit has started. Cancelling requires a cancellation type:

- `PATIENT_LATE` / `PATIENT_ADVANCE` — recoverable capacity
- `CLINIC` — excluded from the recovery-rate denominator

**Reminders.** Booking queues a confirmation immediately plus 24-hour and 2-hour reminders.
Rescheduling and cancelling update the queue. A scheduled job polls every 30 seconds and records
each message as `SENT`, `FAILED`, `CANCELLED` or leaves it `PENDING`. Every delivery attempt adds
an `AppointmentEvent`.

**Waitlist matching.** A waiting entry matches a freed slot when the doctor is the requested
doctor (or any doctor), the date is inside the preferred window, and the slot's time of day
matches the preference. Entries are offered in the order they joined. Booking from the waitlist
sets `origin = WAITLIST`, `recovered = true` and links back to the cancelled appointment, which is
what the recovery metric counts.

**Dashboard attention items** prioritise unconfirmed visits in the next 24 hours, freed slots with
waitlist matches, no-shows needing a follow-up call, and the size of the waiting list.

---

## Metrics

| Metric | Definition used in code |
| --- | --- |
| No-show rate | `NO_SHOW ÷ (COMPLETED + NO_SHOW)` |
| Cancellation rate | `CANCELLED ÷ all appointments booked in the period` |
| Attendance rate | `COMPLETED ÷ (COMPLETED + NO_SHOW)` |
| Slot recovery rate | recovered waitlist bookings ÷ (`PATIENT_LATE + PATIENT_ADVANCE` cancellations) |
| Appointment utilisation | booked non-cancelled minutes ÷ scheduled doctor minutes (minus time-off blocks) |
| Reminder delivery rate | `SENT ÷ (SENT + FAILED)` |
| Confirmation rate | appointments with a confirmation timestamp ÷ non-cancelled appointments |

All rates are computed in [`AnalyticsService.java`](backend/src/main/java/com/clinicflow/service/AnalyticsService.java) and exposed through `/api/analytics`.

---

## API overview

All endpoints except `/api/auth/login` and `/api/public/snapshot` require
`Authorization: Bearer <token>`.

| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | Returns JWT + user profile |
| POST | `/api/auth/register` | Public clinic signup — creates the clinic and its OWNER account |
| GET | `/api/auth/team` | Staff accounts in the clinic (OWNER only) |
| POST | `/api/auth/team` | Create a RECEPTIONIST or DOCTOR account (OWNER only) |
| GET | `/api/auth/me` | Current user |
| GET | `/api/dashboard?date=` | KPIs, agenda, attention items, recovery queue |
| GET | `/api/analytics?from=&to=` | Metrics, trend, per-doctor performance, channels |
| GET | `/api/appointments?from=&to=&doctorId=&status=` | Register |
| GET | `/api/appointments/{id}` | Detail with notifications and events |
| POST | `/api/appointments` | Book (OWNER, RECEPTIONIST) |
| PATCH | `/api/appointments/{id}/reschedule` | Move a visit |
| PATCH | `/api/appointments/{id}/status` | Confirm / attend / no-show |
| POST | `/api/appointments/{id}/confirm` | Patient confirmed |
| POST | `/api/appointments/{id}/cancel` | Requires cancellation type |
| POST | `/api/appointments/{id}/reminder` | Send immediately |
| GET | `/api/patients?q=` | Directory search |
| GET | `/api/patients/{id}` | Profile + appointment history |
| POST / PUT | `/api/patients` | Create / update (OWNER, RECEPTIONIST) |
| GET | `/api/doctors` | Doctors with hours and blocks |
| POST / PUT | `/api/doctors` | OWNER only |
| PUT | `/api/doctors/{id}/schedules` | Replace the weekly grid |
| POST / DELETE | `/api/doctors/{id}/blocks` | Time off |
| GET | `/api/availability?date=` | Free/booked/blocked/past slots per doctor |
| GET | `/api/waitlist` | Entries with match counts |
| POST | `/api/waitlist` | Add a waiting patient |
| POST | `/api/waitlist/{id}/offer` | Book the matched slot (marks recovery) |
| PATCH | `/api/waitlist/{id}/cancel` | Remove an entry |
| GET | `/api/waitlist/recovery?from=&to=` | Open cancelled slots with matches |
| GET | `/api/public/snapshot` | Aggregate demo metrics for the landing page (no patient data) |

Errors are returned as `{ timestamp, status, error, message }`.

---

## Database

Flyway migration [`V1__init.sql`](backend/src/main/resources/db/migration/V1__init.sql) creates:
`clinic`, `app_user`, `clinic_membership`, `doctor`, `doctor_schedule`, `schedule_block`,
`patient`, `appointment`, `appointment_event`, `waitlist_entry`, `notification`.

Appointments store clinic-local wall-clock `DATETIME` values; the clinic's timezone is recorded
on the `clinic` row. A future iteration should store UTC instants and render in the clinic zone.

Multi-tenancy is scoped by `clinic_id` on every read and write, resolved from the JWT membership
claim — never from a client-supplied clinic identifier.

---

## Security notes

- Passwords are BCrypt hashed; the seed password is for the demo only.
- JWT signing secret, database password and SMTP credentials must come from environment
  variables / secrets in any non-demo deployment.
- Route-level restrictions: mutation endpoints require OWNER or RECEPTIONIST; doctor management
  requires OWNER. The doctor role is read-mostly and can still record attendance.
- The public snapshot exposes only aggregate rates.

---

## Verified behaviour

Manually exercised against a seeded MySQL database:

- login for all three roles and role-gated UI (booking hidden for doctors, hours read-only)
- booking from the calendar with slot prefilled, duplicate-slot rejection (409), future-slot validation
- confirm, premature attendance rejection (400), reschedule, cancel with reason
- waitlist offer booking that fills a freed slot and marks the appointment as recovered
- dashboard KPIs/agenda/recovery queue and full analytics with plausible seeded rates
- reminder dispatcher logging deliveries and appending appointment events
- responsive layout at 390px and 1440px without horizontal overflow

No automated test suite is included yet; the flows above were verified through the running API
and browser.

## Next steps

1. Replace the logged email gateway with a transactional email provider and add SMS/WhatsApp.
2. Add a public, no-login booking and self-service cancellation page for patients.
3. Add per-clinic settings (slot length, reminder timings, timezone display) and an invite flow.
4. Add automated tests around availability, capacity and recovery attribution.
