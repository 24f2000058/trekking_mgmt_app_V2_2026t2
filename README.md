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
git clone <repo-url>
cd trekking_mgmt_app_V2_2026t2

# 2. Create and activate a Python virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install Python dependencies
pip install -r backend/requirements.txt

# 4. Ensure Redis is running locally (default port 6379)
#    e.g. on Linux/WSL: redis-server &

# 5. Create the admin account (one-time)
#    python backend/create_admin.py   <-- filled in Milestone 1

# 6. Start the Flask development server
python backend/run.py
```

> Exact Celery worker startup commands will be added in Milestone 3.
