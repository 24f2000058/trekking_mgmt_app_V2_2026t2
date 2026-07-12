import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests

from backend.config import Config


def send_gchat_message(text):
    """Posts a message to the configured Google Chat webhook.
    Falls back to logging the message to a local file if no
    webhook URL is configured, so the demo works without setup."""
    if not Config.GCHAT_WEBHOOK_URL:
        log_path = os.path.join(Config.LOGS_FOLDER, "gchat_log.txt")
        with open(log_path, "a") as f:
            f.write(f"[{datetime.utcnow().isoformat()}] {text}\n")
        return {"delivered": False, "logged_to": log_path}

    try:
        r = requests.post(
            Config.GCHAT_WEBHOOK_URL,
            json={"text": text},
            timeout=5,
        )
        return {"delivered": r.ok, "status_code": r.status_code}
    except requests.RequestException as e:
        return {"delivered": False, "error": str(e)}


def send_email(subject, html_body, to_email):
    """Sends an HTML email via SMTP. Falls back to writing the
    report to a local file if SMTP is not configured, so the
    demo works without setup."""
    if not Config.SMTP_HOST:
        safe_subject = subject.replace(" ", "_").replace("/", "-")
        filename = f"{safe_subject}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.html"
        file_path = os.path.join(Config.REPORTS_FOLDER, filename)
        with open(file_path, "w") as f:
            f.write(html_body)
        return {"delivered": False, "saved_to": file_path}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = Config.MAIL_FROM or Config.SMTP_USERNAME
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT) as server:
            if Config.SMTP_USE_TLS:
                server.starttls()
            if Config.SMTP_USERNAME:
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        return {"delivered": True}
    except Exception as e:
        return {"delivered": False, "error": str(e)}
