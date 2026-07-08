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
