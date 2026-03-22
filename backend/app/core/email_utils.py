import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from .config import get_settings
from .logging import get_logger

settings = get_settings()
logger = get_logger(__name__)
SMTP_HOST = settings.smtp_host
SMTP_PORT = settings.smtp_port
SMTP_USER = settings.smtp_user
SMTP_PASSWORD = settings.smtp_password
SMTP_FROM = settings.smtp_from
SMTP_TIMEOUT = settings.smtp_timeout

def send_email(to_email: str, subject: str, html_body: str):
    try:
        msg = MIMEMultipart()
        msg['From'] = SMTP_FROM
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

        # Prevent auth flows from hanging indefinitely if SMTP is slow/unreachable.
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=SMTP_TIMEOUT)
        server.starttls()
        # Only login if credentials map
        if SMTP_USER and SMTP_PASSWORD:
            server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
        server.quit()
    except Exception:
        logger.error("Failed to send email", extra={"to_email": to_email}, exc_info=True)
        # In actual prod we might raise, but we don't want to crash the request randomly if SMTP is fake
