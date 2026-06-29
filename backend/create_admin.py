import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db
from models import User
from config import Config

app = create_app()

with app.app_context():
    existing = User.query.filter_by(role="admin").first()
    if existing:
        print(f"Admin already exists, skipping. (email: {existing.email})")
    else:
        admin = User(
            name="System Admin",
            email=Config.ADMIN_EMAIL,
            role="admin",
            status="active",
        )
        admin.set_password(Config.ADMIN_PASSWORD)
        db.session.add(admin)
        db.session.commit()
        print(f"Admin created with email: {Config.ADMIN_EMAIL}")
