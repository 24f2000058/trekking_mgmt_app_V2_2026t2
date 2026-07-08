from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from extensions import db


class User(db.Model, UserMixin):
    __tablename__ = "user"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    role = db.Column(db.String(20), nullable=False)  # admin / staff / trekker
    phone = db.Column(db.String(20))
    status = db.Column(db.String(20), default="active")  # active / blacklisted
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, raw):
        self.password_hash = generate_password_hash(raw)

    def check_password(self, raw):
        return check_password_hash(self.password_hash, raw)


class StaffProfile(db.Model):
    __tablename__ = "staff_profile"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), unique=True, nullable=False)
    bio = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref="staff_profile")


class Trek(db.Model):
    __tablename__ = "trek"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    difficulty = db.Column(db.String(20))  # Easy / Moderate / Hard
    duration_days = db.Column(db.Integer)
    total_slots = db.Column(db.Integer)
    available_slots = db.Column(db.Integer)
    assigned_staff_id = db.Column(db.Integer, db.ForeignKey("staff_profile.id"), nullable=True)
    status = db.Column(db.String(20), default="Pending")  # Pending / Approved / Open / Closed / Completed
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assigned_staff = db.relationship("StaffProfile", backref="treks")


class Booking(db.Model):
    __tablename__ = "booking"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    trek_id = db.Column(db.Integer, db.ForeignKey("trek.id"), nullable=False)
    booking_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default="Booked")  # Booked / Cancelled / Completed
    payment_status = db.Column(db.String(20), default="Pending")  # Pending / Paid

    user = db.relationship("User", backref="bookings")
    trek = db.relationship("Trek", backref="bookings")

    __table_args__ = (
        db.UniqueConstraint("user_id", "trek_id", name="uq_user_trek"),
    )
