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

### Demo admin credentials (for local development only — change in production)

| Field    | Value           |
|----------|-----------------|
| Email    | admin@tma.com   |
| Password | Admin@123       |

> **Note:** Override these via `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables, and set a strong `SECRET_KEY` env var before any production deployment.

> Exact Celery worker startup commands will be added in Milestone 3.

## Current Status

**Completed milestones: 0, 1, 2, 3, 4**

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

Not yet implemented: trekker booking flow, Redis caching, Celery background jobs — these arrive in later milestones.
