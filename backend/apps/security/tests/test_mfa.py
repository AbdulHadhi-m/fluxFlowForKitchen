import pytest
import pyotp
from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.security.models import MFADevice, MFARecoveryCode
from apps.security.services import MFAService


@pytest.mark.django_db
class TestMFAService:
    def test_setup_and_verify_totp(self):
        user = User.objects.create_user(
            email="mfa_test@fluxiflow.com",
            password="SecurePassword123!",
            first_name="MFA",
            last_name="Tester",
        )

        device, raw_secret, uri = MFAService.setup_mfa(user)
        assert device is not None
        assert not device.is_verified
        assert not device.is_active
        assert "otpauth://" in uri

        # Generate valid TOTP code
        totp = pyotp.TOTP(raw_secret)
        valid_code = totp.now()

        verified_device, recovery_codes = MFAService.verify_and_activate(user, valid_code)
        assert verified_device.is_verified
        assert verified_device.is_active
        assert len(recovery_codes) == 10

        # Verify active OTP check
        assert MFAService.verify_otp(user, valid_code)
        # Verify invalid OTP rejected
        assert not MFAService.verify_otp(user, "000000")

    def test_recovery_codes_single_use(self):
        user = User.objects.create_user(
            email="recovery_test@fluxiflow.com",
            password="SecurePassword123!",
            first_name="Recovery",
            last_name="Tester",
        )

        _, raw_secret, _ = MFAService.setup_mfa(user)
        totp = pyotp.TOTP(raw_secret)
        _, recovery_codes = MFAService.verify_and_activate(user, totp.now())

        sample_code = recovery_codes[0]

        # Use recovery code
        assert MFAService.verify_recovery_code(user, sample_code)

        # Second use should fail (single-use constraint)
        assert not MFAService.verify_recovery_code(user, sample_code)

    def test_disable_mfa(self):
        user = User.objects.create_user(
            email="disable_mfa@fluxiflow.com",
            password="SecurePassword123!",
            first_name="Disable",
            last_name="Tester",
        )

        _, raw_secret, _ = MFAService.setup_mfa(user)
        totp = pyotp.TOTP(raw_secret)
        MFAService.verify_and_activate(user, totp.now())

        assert MFAService.user_has_mfa(user)

        # Disable
        assert MFAService.disable_mfa(user)
        assert not MFAService.user_has_mfa(user)
        assert not MFADevice.objects.filter(user=user).exists()
