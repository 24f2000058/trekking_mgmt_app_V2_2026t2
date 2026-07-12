import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    # Override via SECRET_KEY env var in production
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(BASE_DIR, "instance", "trekking.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_HTTPONLY = True

    # For local demo only — change in production
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@tma.com")
    ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@123")

    CELERY_BROKER_URL = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND = "redis://localhost:6379/1"

    CACHE_TYPE = "RedisCache"
    CACHE_REDIS_URL = "redis://localhost:6379/2"
    CACHE_DEFAULT_TIMEOUT = 60

    GCHAT_WEBHOOK_URL = ""   # paste a Google Chat incoming webhook URL
                              # here to enable real delivery; blank = logs
                              # to file instead (safe for local demo)

    REMINDER_DAYS_BEFORE = 3  # send a reminder exactly N days before
                                # a trek's start_date

    SMTP_HOST = ""            # e.g. "smtp.gmail.com" — blank = writes
                                # the monthly report to a local file
                                # instead of emailing (safe for local demo)
    SMTP_PORT = 587
    SMTP_USERNAME = ""
    SMTP_PASSWORD = ""
    SMTP_USE_TLS = True
    MAIL_FROM = "noreply@trekmanager.local"

    EXPORT_FOLDER = os.path.join(BASE_DIR, "exports")
    REPORTS_FOLDER = os.path.join(BASE_DIR, "reports")
    LOGS_FOLDER = os.path.join(BASE_DIR, "logs")
