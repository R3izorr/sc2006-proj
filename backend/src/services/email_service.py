from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


def _smtp_client() -> smtplib.SMTP:
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USERNAME")
    pwd = os.getenv("SMTP_PASSWORD")
    if not user or not pwd:
        raise RuntimeError("SMTP credentials not configured")
    client = smtplib.SMTP(host, port)
    client.starttls()
    client.login(user, pwd)
    return client


def _from_addr() -> str:
    user = os.getenv("SMTP_USERNAME", "")
    fallback = f'"Hawker Opportunity" <{user}>' if user else "Hawker Opportunity <no-reply@example.com>"
    return os.getenv("SMTP_FROM", fallback)


def send_email_verification(to_email: str, verify_url: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Verify your email"
    msg["From"] = _from_addr()
    msg["To"] = to_email
    msg.set_content(
        f"""
Please verify your email address.

Verify link: {verify_url}

If you did not create an account, you can ignore this message.
""".strip()
    )
    msg.add_alternative(
        f"""
<html>
  <body>
    <p>Thanks for signing up!</p>
    <p><a href="{verify_url}">Click here to verify your email</a></p>
    <p>If the button doesn't work, copy and paste this URL:<br/>{verify_url}</p>
  </body>
</html>
""",
        subtype="html",
    )
    with _smtp_client() as s:
        s.send_message(msg)


def send_password_reset(to_email: str, reset_url: str) -> None:
    msg = EmailMessage()
    msg["Subject"] = "Reset your password"
    msg["From"] = _from_addr()
    msg["To"] = to_email
    msg.set_content(
        f"""
We received a request to reset your password.

Reset link: {reset_url}

If you did not request this, you can ignore this email.
""".strip()
    )
    msg.add_alternative(
        f"""
<html>
  <body>
    <p>We received a request to reset your password.</p>
    <p><a href="{reset_url}">Click here to reset your password</a></p>
    <p>If you did not request this, you can ignore this email.</p>
  </body>
</html>
""",
        subtype="html",
    )
    with _smtp_client() as s:
        s.send_message(msg)
