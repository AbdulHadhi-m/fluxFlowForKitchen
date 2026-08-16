import uuid
from django.db import models
from django.utils.text import slugify
from apps.core.models import UUIDModel, TimeStampedModel, StatusModel

class Restaurant(UUIDModel, TimeStampedModel, StatusModel):
    """
    Core Tenant entity representing a restaurant organization.
    Forms the boundary for all operational tenant data (Menu, Tables, Orders, KDS, Staff).
    """
    name = models.CharField(
        max_length=200,
        help_text="Primary trading / commercial name of the restaurant"
    )
    legal_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Registered legal business entity name"
    )
    slug = models.SlugField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique URL-safe restaurant identifier slug"
    )
    phone = models.CharField(max_length=30, blank=True, help_text="Contact phone number")
    email = models.EmailField(max_length=255, blank=True, help_text="Official business contact email")
    
    # Location details
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, default="United States")

    # Localization
    timezone = models.CharField(
        max_length=50,
        default="UTC",
        help_text="IANA timezone string (e.g. 'America/New_York', 'Asia/Kolkata')"
    )
    currency = models.CharField(
        max_length=10,
        default="USD",
        help_text="ISO 4217 Currency code (e.g. USD, EUR, GBP, INR)"
    )

    class Meta:
        verbose_name = "Restaurant"
        verbose_name_plural = "Restaurants"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or "restaurant"
            unique_slug = base_slug
            counter = 1
            while Restaurant.objects.filter(slug=unique_slug).exclude(id=self.id).exists():
                unique_slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = unique_slug
        super().save(*args, **kwargs)

class BusinessHour(UUIDModel, TimeStampedModel):
    """
    Weekly operating business hours for a restaurant tenant.
    """
    class DayOfWeek(models.IntegerChoices):
        MONDAY = 0, "Monday"
        TUESDAY = 1, "Tuesday"
        WEDNESDAY = 2, "Wednesday"
        THURSDAY = 3, "Thursday"
        FRIDAY = 4, "Friday"
        SATURDAY = 5, "Saturday"
        SUNDAY = 6, "Sunday"

    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name="business_hours"
    )
    day_of_week = models.IntegerField(
        choices=DayOfWeek.choices,
        help_text="Day of week (0=Monday, 6=Sunday)"
    )
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_closed = models.BooleanField(
        default=False,
        help_text="Indicates whether the restaurant is closed all day on this day"
    )
    is_overnight = models.BooleanField(
        default=False,
        help_text="Indicates operating hours extend past midnight into next day"
    )

    class Meta:
        verbose_name = "Business Hour"
        verbose_name_plural = "Business Hours"
        ordering = ["restaurant", "day_of_week"]
        constraints = [
            models.UniqueConstraint(
                fields=["restaurant", "day_of_week"],
                name="unique_business_hour_day_per_restaurant"
            ),
        ]

    def __str__(self):
        day_name = self.get_day_of_week_display()
        if self.is_closed:
            return f"{self.restaurant.name} - {day_name}: Closed"
        return f"{self.restaurant.name} - {day_name}: {self.opening_time} - {self.closing_time}"
