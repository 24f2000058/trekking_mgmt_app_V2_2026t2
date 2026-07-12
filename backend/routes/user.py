from flask import Blueprint, request, jsonify, send_file
from flask_login import current_user
from backend.extensions import db
from backend.models import Trek, Booking, ExportJob
from backend.routes.helpers import role_required, login_required_api
from backend.tasks.jobs import export_booking_history_csv

user_bp = Blueprint("user", __name__, url_prefix="/api/user")


@user_bp.route("/treks", methods=["GET"])
@role_required("trekker")
def browse_treks():
    query = Trek.query.filter(Trek.status == "Open")

    search = request.args.get("search")
    if search:
        like = f"%{search}%"
        query = query.filter(db.or_(Trek.name.ilike(like), Trek.location.ilike(like)))

    difficulty = request.args.get("difficulty")
    if difficulty:
        query = query.filter(Trek.difficulty == difficulty)

    duration = request.args.get("duration")
    if duration:
        query = query.filter(Trek.duration_days == int(duration))

    location = request.args.get("location")
    if location:
        query = query.filter(Trek.location.ilike(f"%{location}%"))

    treks = query.order_by(Trek.start_date.asc()).all()

    booked_trek_ids = {
        b.trek_id
        for b in Booking.query.filter_by(user_id=current_user.id, status="Booked").all()
    }

    result = []
    for trek in treks:
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
            "is_booked": trek.id in booked_trek_ids
        })
    return jsonify(result)


@user_bp.route("/treks/<int:trek_id>/book", methods=["POST"])
@role_required("trekker")
def book_trek(trek_id):
    trek = Trek.query.get(trek_id)
    if not trek:
        return jsonify({"error": "Trek not found"}), 404

    if trek.status != "Open":
        return jsonify({"error": "This trek is not open for booking."}), 400

    existing = Booking.query.filter_by(user_id=current_user.id, trek_id=trek_id).first()
    if existing and existing.status == "Booked":
        return jsonify({"error": "You have already booked this trek."}), 409

    result = db.session.execute(
        db.update(Trek)
        .where(Trek.id == trek_id, Trek.available_slots > 0)
        .values(available_slots=Trek.available_slots - 1)
    )
    if result.rowcount == 0:
        db.session.rollback()
        return jsonify({"error": "No slots available for this trek."}), 400

    if existing:
        existing.status = "Booked"
        existing.payment_status = "Pending"
        booking = existing
    else:
        booking = Booking(
            user_id=current_user.id,
            trek_id=trek_id,
            status="Booked",
            payment_status="Pending"
        )
        db.session.add(booking)

    db.session.commit()

    return jsonify({
        "message": "Trek booked successfully!",
        "booking_id": booking.id
    }), 201


@user_bp.route("/bookings", methods=["GET"])
@role_required("trekker")
def my_bookings():
    query = Booking.query.filter_by(user_id=current_user.id)

    status = request.args.get("status")
    if status:
        query = query.filter_by(status=status)

    bookings = query.order_by(Booking.booking_date.desc()).all()

    result = []
    for b in bookings:
        result.append({
            "booking_id": b.id,
            "trek_id": b.trek_id,
            "trek_name": b.trek.name,
            "trek_location": b.trek.location,
            "trek_difficulty": b.trek.difficulty,
            "trek_duration_days": b.trek.duration_days,
            "trek_start_date": b.trek.start_date.isoformat() if b.trek.start_date else None,
            "trek_end_date": b.trek.end_date.isoformat() if b.trek.end_date else None,
            "trek_status": b.trek.status,
            "booking_date": b.booking_date.isoformat(),
            "booking_status": b.status,
            "payment_status": b.payment_status
        })
    return jsonify(result)


@user_bp.route("/bookings/<int:booking_id>/cancel", methods=["PUT"])
@role_required("trekker")
def cancel_booking(booking_id):
    booking = Booking.query.filter_by(id=booking_id, user_id=current_user.id).first()
    if not booking:
        return jsonify({"error": "Booking not found"}), 404

    if booking.status == "Cancelled":
        return jsonify({"error": "Booking is already cancelled."}), 400
    if booking.status == "Completed":
        return jsonify({"error": "Completed bookings cannot be cancelled."}), 400

    booking.status = "Cancelled"
    db.session.execute(
        db.update(Trek)
        .where(Trek.id == booking.trek_id, Trek.available_slots < Trek.total_slots)
        .values(available_slots=Trek.available_slots + 1)
    )
    db.session.commit()

    return jsonify({"message": "Booking cancelled. Slot has been restored."})


@user_bp.route("/profile", methods=["GET"])
@login_required_api
def get_profile():
    return jsonify({
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone or "",
        "role": current_user.role,
        "status": current_user.status,
        "created_at": current_user.created_at.isoformat()
    })


@user_bp.route("/profile", methods=["PUT"])
@login_required_api
def update_profile():
    data = request.get_json() or {}

    name = data.get("name")
    if name:
        current_user.name = name

    if "phone" in data:
        current_user.phone = data.get("phone")

    new_password = data.get("new_password")
    if new_password:
        current_password = data.get("current_password")
        if not current_password or not current_user.check_password(current_password):
            return jsonify({"error": "Current password is incorrect."}), 400
        if len(new_password) < 6:
            return jsonify({"error": "New password must be at least 6 characters."}), 400
        current_user.set_password(new_password)

    db.session.commit()
    return jsonify({"message": "Profile updated successfully."})


@user_bp.route("/export-bookings", methods=["POST"])
@role_required("trekker")
def export_bookings():
    job = ExportJob(user_id=current_user.id, status="Pending")
    db.session.add(job)
    db.session.commit()

    export_booking_history_csv.delay(job.id)

    return jsonify({"message": "Export started", "job_id": job.id}), 202


@user_bp.route("/export-bookings/<int:job_id>/status", methods=["GET"])
@role_required("trekker")
def export_bookings_status(job_id):
    job = ExportJob.query.filter_by(id=job_id, user_id=current_user.id).first()
    if not job:
        return jsonify({"error": "Export job not found"}), 404

    return jsonify({
        "job_id": job.id,
        "status": job.status,
        "error_message": job.error_message,
        "download_url": f"/api/user/export-bookings/{job.id}/download"
                         if job.status == "Completed" else None
    }), 200


@user_bp.route("/export-bookings/<int:job_id>/download", methods=["GET"])
@role_required("trekker")
def export_bookings_download(job_id):
    job = ExportJob.query.filter_by(id=job_id, user_id=current_user.id).first()
    if not job:
        return jsonify({"error": "Export job not found"}), 404

    if job.status != "Completed":
        return jsonify({"error": "Export not ready yet"}), 400

    return send_file(
        job.file_path,
        as_attachment=True,
        download_name=f"trekking_history_{current_user.id}.csv"
    )
