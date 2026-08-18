import pytest
from apps.accounts.models import User
from apps.restaurants.models import Restaurant
from apps.security.models import (
    SecurityEvent,
    SecurityEventType,
    SecurityEventSeverity,
    SecurityPolicy,
)
from apps.security.services import (
    FileUploadValidator,
    PIIMaskingService,
    SecurityEventService,
    SecurityPolicyService,
    SSRFValidator,
    StepUpAuthService,
)


@pytest.mark.django_db
class TestSecurityServices:
    def test_security_event_recording(self):
        user = User.objects.create_user(
            email="event_test@fluxiflow.com",
            password="SecurePassword123!",
            first_name="Event",
            last_name="Tester",
        )

        event = SecurityEventService.record(
            event_type=SecurityEventType.AUTH_LOGIN_SUCCESS,
            description="Login from test suite",
            severity=SecurityEventSeverity.LOW,
            user=user,
        )
        assert event.id is not None
        assert event.event_type == SecurityEventType.AUTH_LOGIN_SUCCESS
        assert event.user == user

    def test_ssrf_validator(self):
        # Private IPs should be blocked
        assert not SSRFValidator.is_safe_url("http://127.0.0.1:8000/api")[0]
        assert not SSRFValidator.is_safe_url("http://localhost:5432")[0]
        assert not SSRFValidator.is_safe_url("http://10.0.0.1/admin")[0]
        assert not SSRFValidator.is_safe_url("http://192.168.1.1/")[0]
        assert not SSRFValidator.is_safe_url("http://169.254.169.254/latest/meta-data/")[0]
        assert not SSRFValidator.is_safe_url("file:///etc/passwd")[0]

        # Valid public URLs should pass
        assert SSRFValidator.is_safe_url("https://api.stripe.com/v1/charges")[0]
        assert SSRFValidator.is_safe_url("https://webhook.site/abc-123")[0]

    def test_file_upload_validator(self):
        # Disallowed extensions
        errs = FileUploadValidator.validate("malware.exe", 1024, category="image")
        assert len(errs) > 0

        errs = FileUploadValidator.validate("shell.php", 1024, category="document")
        assert len(errs) > 0

        # Oversized file
        errs = FileUploadValidator.validate("huge.pdf", 20 * 1024 * 1024, category="document")
        assert any("exceeds" in e for e in errs)

        # Valid files
        assert len(FileUploadValidator.validate("menu.pdf", 500 * 1024, category="document")) == 0
        assert len(FileUploadValidator.validate("photo.png", 200 * 1024, category="image")) == 0

    def test_pii_masking(self):
        assert PIIMaskingService.mask_email("john.doe@restaurant.com") == "j***e@restaurant.com"
        assert PIIMaskingService.mask_phone("+1234567890") == "***7890"
        assert PIIMaskingService.mask_name("John Doe") == "J*** D***"

    def test_password_policy_validation(self):
        restaurant = Restaurant.objects.create(
            name="Policy Cafe",
            slug="policy-cafe",
            email="policy@cafe.com",
            currency="USD",
        )
        policy = SecurityPolicyService.get_or_create_policy(restaurant)
        policy.password_min_length = 10
        policy.password_require_uppercase = True
        policy.password_require_number = True
        policy.password_require_special = True
        policy.save()

        # Weak password should fail multiple criteria
        errors = SecurityPolicyService.validate_password_against_policy("simple", restaurant)
        assert len(errors) > 0

        # Strong password should pass
        errors = SecurityPolicyService.validate_password_against_policy("StrongP@ssw0rd!", restaurant)
        assert len(errors) == 0
