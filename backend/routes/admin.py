import time
from datetime import datetime
from flask import Blueprint, request, jsonify
from sqlalchemy import func
from backend.extensions import db, cache
from backend.models import User, StaffProfile, Trek, Booking
from backend.routes.helpers import role_required
from backend.tasks.jobs import send_daily_reminders, generate_monthly_report

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


def trek_to_dict(trek):
    staff_name = trek.assigned_staff.user.name if trek.assigned_staff else None
    return {
        "id": trek.id,
        "name": trek.name,
        "location": trek.location,
        "difficulty": trek.difficulty,
        "duration_days": trek.duration_days,
        "total_slots": trek.total_slots,
        "available_slots": trek.available_slots,
        "assigned_staff_id": trek.assigned_staff_id,
        "assigned_staff_name": staff_name,
        "status": trek.status,
        "start_date": trek.start_date.isoformat() if trek.start_date else None,
        "end_date": trek.end_date.isoformat() if trek.end_date else None,
        "description": trek.description,
        "created_at": trek.created_at.isoformat(),
    }


@admin_bp.route("/stats", methods=["GET"])
@role_required("admin")
def stats():
    start_time = time.time()
    cached_stats = cache.get("admin_stats")

    if cached_stats is not None:
        print("[CACHE HIT] admin_stats")
        elapsed = round((time.time() - start_time) * 1000, 2)
        print(f"[TIMING] /api/admin/stats resolved in {elapsed}ms")
        return jsonify(cached_stats)

    print("[CACHE MISS] admin_stats — querying database")

    total_treks = Trek.query.count()
    total_users = User.query.filter_by(role="trekker").count()
    total_staff = User.query.filter_by(role="staff").count()
    total_bookings = Booking.query.count()

    trek_by_status = dict(
        db.session.query(Trek.status, func.count(Trek.id)).group_by(Trek.status).all()
    )
    bookings_by_status = dict(
        db.session.query(Booking.status, func.count(Booking.id)).group_by(Booking.status).all()
    )

    top_treks_rows = (
        db.session.query(Trek.name, func.count(Booking.id).label("cnt"))
        .join(Booking, Trek.id == Booking.trek_id)
        .group_by(Trek.id)
        .order_by(func.count(Booking.id).desc())
        .limit(5)
        .all()
    )
    top_treks = [{"name": name, "bookings": cnt} for name, cnt in top_treks_rows]

    stats = {
        "total_treks": total_treks,
        "total_users": total_users,
        "total_staff": total_staff,
        "total_bookings": total_bookings,
        "trek_by_status": trek_by_status,
        "bookings_by_status": bookings_by_status,
        "top_treks": top_treks,
    }

    cache.set("admin_stats", stats, timeout=30)
    elapsed = round((time.time() - start_time) * 1000, 2)
    print(f"[TIMING] /api/admin/stats resolved in {elapsed}ms")
    return jsonify(stats), 200


@admin_bp.route("/treks", methods=["GET"])
@role_required("admin")
def list_treks():
    search = request.args.get("search")
    query = Trek.query
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Trek.name.ilike(like), Trek.location.ilike(like)))
    treks = query.order_by(Trek.created_at.desc()).all()
    return jsonify([trek_to_dict(t) for t in treks]), 200


@admin_bp.route("/treks", methods=["POST"])
@role_required("admin")
def create_trek():
    data = request.get_json(silent=True) or {}
    required = ["name", "location", "difficulty", "duration_days", "total_slots", "start_date", "end_date"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    trek = Trek(
        name=data["name"],
        location=data["location"],
        difficulty=data["difficulty"],
        duration_days=data["duration_days"],
        total_slots=data["total_slots"],
        available_slots=data["total_slots"],
        start_date=datetime.strptime(data["start_date"], "%Y-%m-%d").date(),
        end_date=datetime.strptime(data["end_date"], "%Y-%m-%d").date(),
        description=data.get("description"),
        status="Pending",
    )
    db.session.add(trek)
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Trek created", "id": trek.id}), 201


@admin_bp.route("/treks/<int:trek_id>", methods=["PUT"])
@role_required("admin")
def update_trek(trek_id):
    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    data = request.get_json(silent=True) or {}

    if "status" in data and trek.status == "Completed":
        return jsonify({"error": "Completed treks cannot have their status changed."}), 400

    date_fields = {"start_date", "end_date"}
    updatable = [
        "name", "location", "difficulty", "duration_days", "total_slots",
        "available_slots", "start_date", "end_date", "description", "status",
    ]
    for field in updatable:
        if field in data:
            value = data[field]
            if field in date_fields and value:
                value = datetime.strptime(value, "%Y-%m-%d").date()
            setattr(trek, field, value)

    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Trek updated"}), 200


@admin_bp.route("/treks/<int:trek_id>", methods=["DELETE"])
@role_required("admin")
def delete_trek(trek_id):
    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    has_bookings = Booking.query.filter_by(trek_id=trek.id).first() is not None
    if has_bookings:
        return jsonify({
            "error": "This trek has booking history and cannot be deleted. "
                     "Set its status to Closed or Completed instead, or edit its details."
        }), 409

    db.session.delete(trek)
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Trek deleted"}), 200


@admin_bp.route("/treks/<int:trek_id>/approve", methods=["PUT"])
@role_required("admin")
def approve_trek(trek_id):
    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404
    if trek.status != "Pending":
        return jsonify({"error": "Only treks with status 'Pending' can be approved."}), 400
    trek.status = "Approved"
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Trek approved"}), 200


@admin_bp.route("/treks/<int:trek_id>/assign-staff", methods=["PUT"])
@role_required("admin")
def assign_staff(trek_id):
    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    data = request.get_json(silent=True) or {}
    staff_profile_id = data.get("staff_profile_id")
    staff_profile = StaffProfile.query.get(staff_profile_id)
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    trek.assigned_staff_id = staff_profile_id
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Staff assigned to trek"}), 200


@admin_bp.route("/staff-list", methods=["GET"])
@role_required("admin")
def staff_list():
    staff = (
        db.session.query(StaffProfile)
        .join(User, StaffProfile.user_id == User.id)
        .filter(User.role == "staff", User.status == "active")
        .all()
    )
    return jsonify([
        {"staff_profile_id": s.id, "name": s.user.name} for s in staff
    ]), 200


@admin_bp.route("/staff", methods=["GET"])
@role_required("admin")
def list_staff():
    search = request.args.get("search")
    query = User.query.filter_by(role="staff")
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like)))
    staff_users = query.all()

    result = []
    for u in staff_users:
        profile = StaffProfile.query.filter_by(user_id=u.id).first()
        result.append({
            "user_id": u.id,
            "staff_profile_id": profile.id if profile else None,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "status": u.status,
            "bio": profile.bio if profile else None,
            "created_at": u.created_at.isoformat(),
            "assigned_treks": (
                [{"id": t.id, "name": t.name} for t in profile.treks] if profile else []
            ),
        })
    return jsonify(result), 200


@admin_bp.route("/staff", methods=["POST"])
@role_required("admin")
def create_staff():
    data = request.get_json(silent=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    phone = data.get("phone")
    bio = data.get("bio")

    if not name or not email or not password:
        return jsonify({"error": "Name, email and password are required"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 400

    user = User(name=name, email=email, role="staff", status="active", phone=phone)
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    profile = StaffProfile(user_id=user.id, bio=bio or "")
    db.session.add(profile)
    db.session.commit()

    return jsonify({"message": "Staff created", "id": user.id}), 201


@admin_bp.route("/staff/<int:user_id>/status", methods=["PUT"])
@role_required("admin")
def update_staff_status(user_id):
    user = User.query.filter_by(id=user_id, role="staff").first()
    if not user:
        return jsonify({"error": "Staff member not found"}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("active", "blacklisted"):
        return jsonify({"error": "Invalid status"}), 400

    user.status = status
    db.session.commit()
    return jsonify({"message": "Staff status updated"}), 200


@admin_bp.route("/users", methods=["GET"])
@role_required("admin")
def list_users():
    search = request.args.get("search")
    query = User.query.filter_by(role="trekker")
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like)))
    users = query.all()

    result = [{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "phone": u.phone,
        "status": u.status,
        "created_at": u.created_at.isoformat(),
        "total_bookings": len(u.bookings),
    } for u in users]
    return jsonify(result), 200


@admin_bp.route("/users/<int:user_id>/status", methods=["PUT"])
@role_required("admin")
def update_user_status(user_id):
    user = User.query.filter_by(id=user_id, role="trekker").first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("active", "blacklisted"):
        return jsonify({"error": "Invalid status"}), 400

    user.status = status
    db.session.commit()
    return jsonify({"message": "User status updated"}), 200


@admin_bp.route("/bookings", methods=["GET"])
@role_required("admin")
def list_bookings():
    bookings = Booking.query.order_by(Booking.booking_date.desc()).all()
    result = [{
        "id": b.id,
        "user_name": b.user.name,
        "user_email": b.user.email,
        "trek_name": b.trek.name,
        "trek_location": b.trek.location,
        "booking_date": b.booking_date.isoformat(),
        "status": b.status,
        "payment_status": b.payment_status,
    } for b in bookings]
    return jsonify(result), 200


@admin_bp.route("/history", methods=["GET"])
@role_required("admin")
def trek_history():
    treks = (
        Trek.query.filter_by(status="Completed")
        .order_by(Trek.end_date.desc())
        .all()
    )

    result = []
    for trek in treks:
        completed_count = Booking.query.filter_by(trek_id=trek.id, status="Completed").count()
        cancelled_count = Booking.query.filter_by(trek_id=trek.id, status="Cancelled").count()
        total_ever_booked = Booking.query.filter_by(trek_id=trek.id).count()
        result.append({
            "trek_id": trek.id,
            "name": trek.name,
            "location": trek.location,
            "start_date": trek.start_date.isoformat() if trek.start_date else None,
            "end_date": trek.end_date.isoformat() if trek.end_date else None,
            "assigned_staff_name": trek.assigned_staff.user.name if trek.assigned_staff else None,
            "completed_count": completed_count,
            "cancelled_count": cancelled_count,
            "total_ever_booked": total_ever_booked,
        })
    return jsonify(result), 200


@admin_bp.route("/trigger-reminders", methods=["POST"])
@role_required("admin")
def trigger_reminders():
    send_daily_reminders.delay()
    return jsonify({
        "message": "Reminder job triggered. Check logs/gchat_log.txt or your configured Google Chat space shortly."
    }), 202


@admin_bp.route("/trigger-monthly-report", methods=["POST"])
@role_required("admin")
def trigger_monthly_report():
    generate_monthly_report.delay()
    return jsonify({
        "message": "Monthly report job triggered. Check the reports/ folder or admin email shortly."
    }), 202


@admin_bp.route("/search", methods=["GET"])
@role_required("admin")
def search():
    q = request.args.get("q", "")
    search_type = request.args.get("type", "all")
    like = f"%{q}%"
    result = {}

    if search_type in ("treks", "all"):
        treks = (
            Trek.query.filter(db.or_(Trek.name.ilike(like), Trek.location.ilike(like)))
            .limit(10).all()
        )
        result["treks"] = [
            {"id": t.id, "name": t.name, "location": t.location, "status": t.status}
            for t in treks
        ]

    if search_type in ("users", "all"):
        users = (
            User.query.filter_by(role="trekker")
            .filter(db.or_(User.name.ilike(like), User.email.ilike(like)))
            .limit(10).all()
        )
        result["users"] = [
            {"id": u.id, "name": u.name, "email": u.email, "status": u.status}
            for u in users
        ]

    if search_type in ("staff", "all"):
        staff = (
            User.query.filter_by(role="staff")
            .filter(db.or_(User.name.ilike(like), User.email.ilike(like)))
            .limit(10).all()
        )
        result["staff"] = [
            {"id": u.id, "name": u.name, "email": u.email, "status": u.status}
            for u in staff
        ]

    return jsonify(result), 200
