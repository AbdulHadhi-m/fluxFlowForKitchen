from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class PublicAuthThrottle(AnonRateThrottle):
    """Throttle for sensitive public endpoints (login, password reset)."""
    scope = "auth_public"
    rate = "60/minute"

class BurstUserThrottle(UserRateThrottle):
    """Short-term burst throttle for authenticated operations."""
    scope = "user_burst"
    rate = "120/minute"

class SustainedUserThrottle(UserRateThrottle):
    """Longer-term sustained throttle for authenticated operations."""
    scope = "user_sustained"
    rate = "2000/hour"
