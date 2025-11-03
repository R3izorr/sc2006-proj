import os, smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
load_dotenv()  # loads root .env

host = os.getenv("SMTP_HOST", "smtp.gmail.com")
port = int(os.getenv("SMTP_PORT", "587"))
user = os.getenv("SMTP_USERNAME", "ngsc09053@gmail.com")
pwd  = os.getenv("SMTP_PASSWORD", "")
from_addr = os.getenv("SMTP_FROM")
to_addr = os.getenv("SMTP_TEST_TO", user)  # or hardcode a recipient

msg = EmailMessage()
msg["Subject"] = "SMTP test"
msg["From"] = from_addr
msg["To"] = to_addr
msg.set_content("If you received this, SMTP is working.")

with smtplib.SMTP(host, port) as s:
    s.starttls()
    s.login(user, pwd)
    s.send_message(msg)
print("Sent")