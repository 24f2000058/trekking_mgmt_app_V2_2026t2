from celery import Celery
from celery.schedules import crontab
from backend.config import Config

celery = Celery(
    "trekking_tasks",
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
)

celery.conf.timezone = "UTC"

celery.conf.beat_schedule = {
    "daily-trek-reminders": {
        "task": "backend.tasks.jobs.send_daily_reminders",
        "schedule": crontab(hour=8, minute=0),   # every day at 08:00
    },
    "monthly-admin-report": {
        "task": "backend.tasks.jobs.generate_monthly_report",
        "schedule": crontab(day_of_month=1, hour=6, minute=0),
    },
}

# Make sure task modules are registered with this Celery app
import backend.tasks.jobs  # noqa: E402,F401
