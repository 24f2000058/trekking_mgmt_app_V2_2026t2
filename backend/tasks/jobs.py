import csv
import os
from datetime import date, timedelta

from backend.tasks.celery_app import celery
from backend.tasks.notify import send_gchat_message, send_email


@celery.task(name="backend.tasks.jobs.send_daily_reminders")
def send_daily_reminders():
    from backend.app import create_app
    from backend.extensions import db
    from backend.models import Booking, Trek

    app = create_app()
    with app.app_context():
        target_date = date.today() + timedelta(
            days=app.config["REMINDER_DAYS_BEFORE"]
        )
        bookings = (
            Booking.query.join(Trek)
            .filter(Booking.status == "Booked", Trek.start_date == target_date)
            .all()
        )

        sent_count = 0
        for b in bookings:
            message = (
                f"🏔️ Trek Reminder: Hi {b.user.name}, your trek "
                f"'{b.trek.name}' in {b.trek.location} starts on "
                f"{b.trek.start_date.isoformat()}. Duration: "
                f"{b.trek.duration_days} day(s). "
                f"{b.trek.description or 'Please be prepared and arrive on time.'}"
            )
            send_gchat_message(message)
            sent_count += 1

        return f"Sent {sent_count} reminder(s) for treks starting {target_date}"


@celery.task(name="backend.tasks.jobs.generate_monthly_report")
def generate_monthly_report():
    from backend.app import create_app
    from backend.extensions import db
    from backend.models import Trek, Booking, User
    from sqlalchemy import func

    app = create_app()
    with app.app_context():
        today = date.today()
        first_of_this_month = today.replace(day=1)
        if today.month == 1:
            prev_first = date(today.year - 1, 12, 1)
        else:
            prev_first = date(today.year, today.month - 1, 1)
        prev_last = first_of_this_month - timedelta(days=1)

        treks_conducted = Trek.query.filter(
            Trek.status == "Completed",
            Trek.end_date >= prev_first,
            Trek.end_date <= prev_last,
        ).count()

        participant_count = (
            db.session.query(func.count(func.distinct(Booking.user_id)))
            .join(Trek)
            .filter(
                Booking.status != "Cancelled",
                Trek.end_date >= prev_first,
                Trek.end_date <= prev_last,
            )
            .scalar()
        ) or 0

        popular = (
            db.session.query(Trek.name, func.count(Booking.id).label("cnt"))
            .join(Booking)
            .filter(Trek.end_date >= prev_first, Trek.end_date <= prev_last)
            .group_by(Trek.id)
            .order_by(func.count(Booking.id).desc())
            .limit(5)
            .all()
        )

        rows_html = "".join(
            f"<tr><td>{name}</td><td>{cnt}</td></tr>" for name, cnt in popular
        ) or "<tr><td colspan='2'>No bookings this period</td></tr>"

        html_body = f"""
        <html><body style="font-family: Arial, sans-serif;">
          <h2>TrekManager — Monthly Activity Report</h2>
          <p>Period: {prev_first.isoformat()} to {prev_last.isoformat()}</p>
          <ul>
            <li><strong>Treks Conducted:</strong> {treks_conducted}</li>
            <li><strong>Participants Involved:</strong> {participant_count}</li>
          </ul>
          <h3>Top Treks (by bookings this period)</h3>
          <table border="1" cellpadding="6" cellspacing="0">
            <tr><th>Trek Name</th><th>Bookings</th></tr>
            {rows_html}
          </table>
        </body></html>
        """

        admin = User.query.filter_by(role="admin").first()
        to_email = admin.email if admin else app.config["ADMIN_EMAIL"]

        result = send_email(
            subject=f"TrekManager Monthly Report - {prev_first.strftime('%B %Y')}",
            html_body=html_body,
            to_email=to_email,
        )
        return result


@celery.task(name="backend.tasks.jobs.export_booking_history_csv")
def export_booking_history_csv(export_job_id):
    from backend.app import create_app
    from backend.extensions import db
    from backend.models import ExportJob, Booking

    app = create_app()
    with app.app_context():
        job = ExportJob.query.get(export_job_id)
        if not job:
            return "Export job not found"

        try:
            bookings = (
                Booking.query.filter_by(user_id=job.user_id)
                .order_by(Booking.booking_date.desc())
                .all()
            )

            filename = f"export_{export_job_id}_{job.user_id}.csv"
            file_path = os.path.join(app.config["EXPORT_FOLDER"], filename)

            with open(file_path, "w", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([
                    "User ID", "Trek Name", "Location", "Booking Status",
                    "Booking Date", "Trek Start Date", "Trek End Date"
                ])
                for b in bookings:
                    writer.writerow([
                        b.user_id,
                        b.trek.name,
                        b.trek.location,
                        b.status,
                        b.booking_date.isoformat(),
                        b.trek.start_date.isoformat() if b.trek.start_date else "",
                        b.trek.end_date.isoformat() if b.trek.end_date else "",
                    ])

            job.status = "Completed"
            job.file_path = file_path
            from datetime import datetime as dt
            job.completed_at = dt.utcnow()
            db.session.commit()
            return f"Export completed: {file_path}"

        except Exception as e:
            job.status = "Failed"
            job.error_message = str(e)
            db.session.commit()
            return f"Export failed: {e}"
