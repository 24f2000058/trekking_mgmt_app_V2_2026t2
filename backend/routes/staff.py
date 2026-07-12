from flask import Blueprint, request, jsonify
from flask_login import current_user
from backend.extensions import db, cache
from backend.models import StaffProfile, Trek, Booking
from backend.routes.helpers import role_required

staff_bp = Blueprint("staff", __name__, url_prefix="/api/staff")


@staff_bp.route("/my-treks", methods=["GET"])
@role_required("staff")
def my_treks():
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    treks = (
        Trek.query.filter_by(assigned_staff_id=staff_profile.id)
        .order_by(Trek.start_date.asc())
        .all()
    )

    result = []
    for trek in treks:
        active_bookings = Booking.query.filter(
            Booking.trek_id == trek.id, Booking.status != "Cancelled"
        ).count()
        result.append({
            "id": trek.id,
            "name": trek.name,
            "location": trek.location,
            "difficulty": trek.difficulty,
            "duration_days": trek.duration_days,
            "total_slots": trek.total_slots,
            "available_slots": trek.available_slots,
            "status": trek.status,
            "start_date": trek.start_date.isoformat() if trek.start_date else None,
            "end_date": trek.end_date.isoformat() if trek.end_date else None,
            "description": trek.description or "",
            "active_bookings": active_bookings,
        })
    return jsonify(result), 200


@staff_bp.route("/treks/<int:trek_id>/participants", methods=["GET"])
@role_required("staff")
def trek_participants(trek_id):
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    if trek.assigned_staff_id != staff_profile.id:
        return jsonify({"error": "You are not assigned to this trek"}), 403

    bookings = (
        Booking.query.filter(Booking.trek_id == trek_id, Booking.status != "Cancelled")
        .order_by(Booking.booking_date.asc())
        .all()
    )

    result = [{
        "booking_id": b.id,
        "user_id": b.user_id,
        "user_name": b.user.name,
        "user_email": b.user.email,
        "user_phone": b.user.phone or "",
        "booking_date": b.booking_date.isoformat(),
        "booking_status": b.status,
        "payment_status": b.payment_status,
    } for b in bookings]
    return jsonify(result), 200


@staff_bp.route("/treks/<int:trek_id>/slots", methods=["PUT"])
@role_required("staff")
def update_slots(trek_id):
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    if trek.assigned_staff_id != staff_profile.id:
        return jsonify({"error": "You are not assigned to this trek"}), 403

    data = request.get_json(silent=True) or {}
    available_slots = data.get("available_slots")
    if not isinstance(available_slots, int) or isinstance(available_slots, bool) or available_slots < 0:
        return jsonify({"error": "available_slots must be a non-negative integer"}), 400
    if available_slots > trek.total_slots:
        return jsonify({"error": f"Available slots cannot exceed total slots ({trek.total_slots})"}), 400

    trek.available_slots = available_slots
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Slots updated", "available_slots": trek.available_slots}), 200


@staff_bp.route("/treks/<int:trek_id>/status", methods=["PUT"])
@role_required("staff")
def update_status(trek_id):
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    if trek.assigned_staff_id != staff_profile.id:
        return jsonify({"error": "You are not assigned to this trek"}), 403

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("Open", "Closed", "Completed"):
        return jsonify({"error": "Invalid status. Allowed: Open, Closed, Completed"}), 400

    if trek.status == "Pending":
        return jsonify({"error": "This trek has not been approved by admin yet."}), 400
    if trek.status == "Completed":
        return jsonify({"error": "Completed treks cannot be reopened or modified."}), 400

    trek.status = status
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Trek status updated", "status": trek.status}), 200


@staff_bp.route("/treks/<int:trek_id>/participants/<int:booking_id>/status", methods=["PUT"])
@role_required("staff")
def update_booking_status(trek_id, booking_id):
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    if trek.assigned_staff_id != staff_profile.id:
        return jsonify({"error": "You are not assigned to this trek"}), 403

    data = request.get_json(silent=True) or {}
    status = data.get("status")
    if status not in ("Completed", "Cancelled"):
        return jsonify({"error": "Invalid status. Allowed: Completed, Cancelled"}), 400

    booking = Booking.query.filter_by(id=booking_id, trek_id=trek_id).first()
    if not booking:
        return jsonify({"error": "Booking not found for this trek"}), 404

    if status == "Cancelled" and booking.status == "Booked":
        db.session.execute(
            db.update(Trek)
            .where(Trek.id == trek.id, Trek.available_slots < Trek.total_slots)
            .values(available_slots=Trek.available_slots + 1)
        )

    booking.status = status
    db.session.commit()
    cache.clear()
    print("[CACHE CLEARED] due to trek/booking data change")
    return jsonify({"message": "Booking status updated"}), 200


@staff_bp.route("/dashboard-summary", methods=["GET"])
@role_required("staff")
def dashboard_summary():
    staff_profile = StaffProfile.query.filter_by(user_id=current_user.id).first()
    if not staff_profile:
        return jsonify({"error": "Staff profile not found"}), 404

    treks = Trek.query.filter_by(assigned_staff_id=staff_profile.id).all()
    total_assigned_treks = len(treks)
    active_treks = sum(1 for t in treks if t.status in ("Approved", "Open"))
    trek_ids = [t.id for t in treks]
    total_participants = (
        Booking.query.filter(Booking.trek_id.in_(trek_ids), Booking.status != "Cancelled").count()
        if trek_ids else 0
    )

    return jsonify({
        "total_assigned_treks": total_assigned_treks,
        "active_treks": active_treks,
        "total_participants": total_participants,
    }), 200
