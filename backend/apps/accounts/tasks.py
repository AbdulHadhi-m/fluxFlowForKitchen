import logging
from django.conf import settings
from django.core.mail import send_mail
from celery import shared_task

logger = logging.getLogger("fluxiflow.accounts")

@shared_task(name="accounts.send_password_reset_email", max_retries=3, default_retry_delay=60)
def send_password_reset_email(user_email: str, reset_token: str, reset_url: str):
    """
    Asynchronous Celery task to send password reset instructions to user.
    """
    subject = "Fluxiflow for Kitchen — Password Reset Request"
    message = (
        f"Hello,\n\n"
        f"You requested a password reset for your Fluxiflow account.\n"
        f"Please use the link below to set a new password:\n\n"
        f"{reset_url}?token={reset_token}\n\n"
        f"This link is valid for 15 minutes and can only be used once.\n"
        f"If you did not request this, please ignore this email.\n\n"
        f"— Fluxiflow Operations Team"
    )
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@fluxiflow.com")

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=from_email,
            recipient_list=[user_email],
            fail_silently=False,
        )
        logger.info("Password reset email sent to %s", user_email)
        return True
    except Exception as exc:
        from apps.monitoring.constants import ExternalCallStatus
        from apps.monitoring.services import ExternalCallRecorder

        ExternalCallRecorder.record(
            service="EMAIL", status=ExternalCallStatus.FAILURE, duration_ms=0,
        )
        logger.error("Failed to send password reset email to %s: %s", user_email, exc)
        raise exc
