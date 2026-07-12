# Trekking Management Application V2 for MAD 2 project

A web application for managing trekking expeditions and bookings. Admins create and publish treks; staff manage bookings and on-ground operations; trekkers browse available treks, book spots, and track their trip history. The system supports three distinct roles — **admin**, **staff**, and **trekker** — all stored in a single unified User model.

## Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** Vue 3 (via CDN, no build step) + Bootstrap (via CDN)
- **Database:** SQLite (managed via SQLAlchemy — never created manually)
- **Caching:** Redis + Flask-Caching
- **Background Jobs:** Celery + Redis

## Setup & Run

```bash
# 1. Clone the repository
git clone https://github.com/24f2000058/trekking_mgmt_app_V2_2026t2
cd trekking_mgmt_app_V2_2026t2

# 2. Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Ensure Redis is running locally (default port 6379)
#    e.g. on Linux/WSL: redis-server &

# 5. Create the admin account (run once — safe to re-run, it's idempotent)
python backend/create_admin.py

# 6. Start the Flask development server
python backend/run.py
```

### Running background jobs (Celery + Redis)

Milestone 7 adds three background jobs (daily trek reminders, monthly admin
report, async CSV export) that run via Celery, with Celery Beat handling the
recurring schedule. A full local demo needs three terminals running at once,
all from the repository root (the folder containing `backend/`):

```bash
# Terminal 1 — Redis (message broker + result backend)
redis-server

# Terminal 2 — Flask app
python backend/run.py

# Terminal 3 — Celery worker + beat scheduler (combined, simplest for local dev)
celery -A backend.tasks.celery_app.celery worker --beat --loglevel=info
```

> **Windows users:** add `--pool=solo` if the worker fails to start:
> `celery -A backend.tasks.celery_app.celery worker --beat --loglevel=info --pool=solo`

By default `GCHAT_WEBHOOK_URL` and `SMTP_HOST` in `backend/config.py` are left
blank, so the reminder and report jobs write their output to local files
instead of making real network calls — this keeps the demo fully runnable
without any external credentials:
- Reminder messages: `backend/logs/gchat_log.txt`
- Monthly report: an HTML file in `backend/reports/`
- CSV exports: `backend/exports/`

Paste a real Google Chat incoming webhook URL / SMTP credentials into
`backend/config.py` to enable real delivery instead.

### Caching (Redis + Flask-Caching)

Milestone 8 caches the two most frequently-hit read endpoints:

- `GET /api/user/treks` — the shared, user-independent trek fields are
  cached per filter combination (`search`/`difficulty`/`location`/`duration`)
  for **60s**; the per-user `is_booked` flag is always computed fresh from
  the current user's bookings on every request, never from cache.
- `GET /api/admin/stats` — the full stats response is cached as a single
  key for **30s** (shorter TTL since dashboard stats change more often
  across the whole app).

Both use Flask-Caching's Redis backend (`CACHE_REDIS_URL` = db 2, separate
from the Celery broker/result-backend dbs 0/1) with manual `cache.get()` /
`cache.set()` calls inside the routes rather than the `@cache.cached`
decorator — this is what makes it safe to cache the shared trek data while
still computing `is_booked` per logged-in user.

**Invalidation strategy:** rather than tracking every possible cache key
combination, any write operation that could change trek or booking data
(trek create/update/delete/approve/assign-staff, slot/status changes,
book/cancel) calls `cache.clear()` right after `db.session.commit()`,
wiping the entire cache. This is a deliberate simplicity trade-off
appropriate for this app's size, favoring correctness over cache hit-rate
optimization.

Useful commands for inspecting/resetting the cache during grading/demo:

```bash
redis-cli -n 2 keys '*'      # see live cache keys (db 2)
redis-cli -n 2 flushdb       # clear the cache manually
```

The Flask server console also logs `[CACHE HIT]` / `[CACHE MISS]` /
`[CACHE CLEARED]` / `[TIMING] ... resolved in Xms` lines for each request
to these two endpoints, useful for demonstrating the caching behavior live.

### Demo admin credentials (for local development only — change in production)

| Field    | Value           |
|----------|-----------------|
| Email    | admin@tma.com   |
| Password | Admin@123       |

> **Note:** Override these via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, and set a strong `SECRET_KEY` env var before any production deployment.

> Exact Celery worker startup commands will be added in Milestone 3.

## Current Status

**Completed milestones: 0, 1, 2, 3, 4, 5, 6, 7, 8**

- **Milestone 0** — Project scaffold (Flask app factory, config, folder layout).
- **Milestone 1** — Database models (`User`, `StaffProfile`, `Trek`, `Booking`) and programmatic admin creation.
- **Milestone 2** — Session-based authentication and role-based access:
  - Backend: Flask-Login session auth, `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`; `login_required_api` and `role_required` helper decorators for use by future blueprints.
  - Frontend: Vue 3 (CDN) SPA served from `backend/static/`, hash-based Vue Router with `/login`, `/register`, `/admin`, `/staff`, `/dashboard` routes, a shared `Navbar` component, and role-specific dashboard placeholders.
  - Trekkers can self-register and log in; staff and admin accounts are login-only (no self-registration).
- **Milestone 3** — Admin dashboard and full management features:
  - Backend: `admin_bp` blueprint (`/api/admin/*`), all endpoints guarded by `role_required("admin")`:
    - `GET /stats` — dashboard summary stats (trek/user/staff/booking counts, status breakdowns, top treks).
    - `GET/POST /treks`, `PUT/DELETE /treks/<id>`, `PUT /treks/<id>/approve`, `PUT /treks/<id>/assign-staff` — full trek CRUD, approval, and staff assignment.
    - `GET /staff-list` — active staff for assignment dropdowns.
    - `GET/POST /staff`, `PUT /staff/<user_id>/status` — staff creation, listing (with assigned treks), blacklist/activate.
    - `GET /users`, `PUT /users/<user_id>/status` — trekker listing, blacklist/activate.
    - `GET /bookings` — all bookings across the system.
    - `GET /search` — cross-entity search (treks/users/staff).
  - Frontend: real `AdminDashboard` with stat cards and Bootstrap tabs (Overview, Treks, Staff, Users, Bookings, Search), backed by four new components under `backend/static/js/views/admin/`: `TrekManagement`, `StaffManagement`, `UserManagement`, `BookingManagement`.

- **Milestone 4** — Trek staff dashboard and trek operations:
  - Backend: `staff_bp` blueprint (`/api/staff/*`), all endpoints guarded by `role_required("staff")` plus a per-route check that the trek is assigned to the logged-in staff member's profile (403 otherwise):
    - `GET /my-treks` — treks assigned to the logged-in staff member, with active (non-cancelled) booking counts.
    - `GET /treks/<id>/participants` — registered (non-cancelled) trekkers for one of the staff member's treks.
    - `PUT /treks/<id>/slots` — update `available_slots` (validated against `total_slots`).
    - `PUT /treks/<id>/status` — update trek status, restricted to `Open`/`Closed`/`Completed` (staff cannot set `Pending`/`Approved`).
    - `PUT /treks/<id>/participants/<booking_id>/status` — mark a booking `Completed` or `Cancelled` (cancelling restores a slot).
    - `GET /dashboard-summary` — assigned trek count, active trek count, total participant count.
  - Frontend: real `StaffDashboard` with summary cards, backed by two new components under `backend/static/js/views/staff/`: `AssignedTreks` (trek cards with inline slot/status management) and `ParticipantList` (registered trekkers for a selected trek).

- **Milestone 5** — User dashboard and trek booking system:
  - Backend: `user_bp` blueprint (`/api/user/*`):
    - `GET /treks` — browse `Open` treks only, with `search`/`difficulty`/`location`/`duration` filters and an `is_booked` flag per trek.
    - `POST /treks/<id>/book` — book a trek, enforcing open-status, available-slots, and duplicate-active-booking checks; reuses an existing cancelled booking row for the same user/trek to satisfy the `(user_id, trek_id)` unique constraint.
    - `GET /bookings` — full booking history for the logged-in trekker (own bookings only), optional `status` filter.
    - `PUT /bookings/<id>/cancel` — cancel one's own booking and restore the trek slot.
    - `GET/PUT /profile` (`login_required_api`) — view/update own name and phone, optional password change; email and role are immutable from this endpoint.
  - Frontend: real `UserDashboard` with stat cards and Bootstrap tabs, backed by three new components under `backend/static/js/views/user/`: `TrekBrowser` (search/filter/book), `MyBookings` (history + cancel), `EditProfile`.

- **Milestone 6** — Trek status transition rules and history protection (patches against the Milestone 6 spec, no new blueprints):
  - **Atomic slot accounting** — booking/cancelling now uses a single conditional `UPDATE ... WHERE available_slots > 0` (or `< total_slots` for restores) instead of read-then-write in Python, closing a race condition that could cause overbooking under concurrent requests.
  - **Trek status transition guards** — treks must now move `Pending → Approved → Open → Closed → Completed` in order: admin can only approve `Pending` treks, staff cannot change the status of a not-yet-approved or already-`Completed` trek, and admin's general trek-update endpoint rejects any `status` change on a `Completed` trek (other fields remain editable).
  - **Trek deletion protection** — `DELETE /api/admin/treks/<id>` now refuses (409) to delete a trek that has any booking history (`Booked`, `Cancelled`, or `Completed`), preserving trekking history; only treks with zero bookings can be deleted.
  - **Admin trek history view** — new `GET /api/admin/history` endpoint lists all `Completed` treks with per-trek completed/cancelled/total-booked counts, surfaced in the Admin dashboard under a new "History" tab.

- **Milestone 7** — Background jobs via Celery + Redis:
  - `backend/tasks/celery_app.py` — Celery app instance (broker/backend = Redis DBs 0/1) with a Celery Beat schedule: daily trek reminders at 08:00 UTC, monthly admin report on the 1st at 06:00 UTC.
  - `backend/tasks/notify.py` — dependency-free `send_gchat_message()` / `send_email()` helpers; each falls back to writing to a local file (`backend/logs/`, `backend/reports/`) when no webhook URL / SMTP host is configured, so the demo runs without external credentials.
  - Three Celery tasks in `backend/tasks/jobs.py`:
    - `send_daily_reminders` — finds all `Booked` bookings for treks starting exactly `REMINDER_DAYS_BEFORE` (default 3) days out and posts one Google Chat message per booking (naming the trekker) to the configured Space.
    - `generate_monthly_report` — builds an HTML summary (treks conducted, participants, top treks by bookings) for the previous calendar month and emails it to the admin.
    - `export_booking_history_csv(export_job_id)` — writes the calling user's full booking history to a CSV file and updates the corresponding `ExportJob` row.
  - New `ExportJob` model tracks user-triggered CSV export jobs (`Pending` / `Completed` / `Failed`) so the frontend can poll for completion.
  - New user endpoints (`role_required("trekker")`): `POST /api/user/export-bookings` (enqueues the export), `GET /api/user/export-bookings/<id>/status` (poll target), `GET /api/user/export-bookings/<id>/download` (serves the finished CSV).
  - New admin endpoints (`role_required("admin")`): `POST /api/admin/trigger-reminders` and `POST /api/admin/trigger-monthly-report` — manual "run now" triggers for demo/testing; the real production trigger is the Celery Beat schedule above.
  - Frontend: `MyBookings` gained an "Export as CSV" button that polls the status endpoint every 2 seconds and shows a download link on completion; `AdminDashboard`'s Overview tab gained an "Admin Tools" card with the two manual trigger buttons.
  - Note: Google Chat webhooks post to a single Space (not individual DMs — that would require Workspace OAuth), so "reminders to users" means one message per booking, naming the trekker, posted to that shared Space.
  - See "Running background jobs (Celery + Redis)" above for the local run instructions.

- **Milestone 8** — API performance optimization and caching:
  - `backend/extensions.py` gained a `cache = Cache()` (Flask-Caching) instance, initialized in `create_app()` with `CACHE_TYPE = "RedisCache"` pointed at Redis db 2 (left free for this purpose since Milestone 7).
  - `GET /api/user/treks` and `GET /api/admin/stats` now check Redis first via manual `cache.get()`/`cache.set()` calls (not the `@cache.cached` decorator), since the treks response mixes shared trek data with a per-user `is_booked` flag that can never be cached — see "Caching" above for the full design rationale, TTLs, and invalidation strategy.
  - Every trek/booking-mutating route across `admin_bp`, `staff_bp`, and `user_bp` now calls `cache.clear()` immediately after its `db.session.commit()`, so stale cached data is never served after a write.
  - No frontend or API-contract changes — this milestone is purely a backend performance optimization.
