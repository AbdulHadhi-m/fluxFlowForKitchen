import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction

from apps.marketing.models import Promotion, PromotionStatus, Coupon, CouponStatus, Campaign, CampaignStatus
from apps.marketing.services import CampaignService

logger = logging.getLogger("fluxiflow.marketing.tasks")


@shared_task(name="apps.marketing.tasks.process_scheduled_campaigns")
def process_scheduled_campaigns():
    """
    Periodic task checking for SCHEDULED campaigns whose start_at timestamp has arrived.
    Launches campaign execution asynchronously.
    """
    now = timezone.now()
    scheduled_campaigns = Campaign.objects.filter(
        status=CampaignStatus.SCHEDULED,
        start_at__lte=now
    )

    processed_count = 0
    for campaign in scheduled_campaigns:
        try:
            logger.info("Executing scheduled marketing campaign %s (%s)", campaign.id, campaign.name)
            CampaignService.launch_campaign(campaign=campaign)
            processed_count += 1
        except Exception as exc:
            logger.error("Failed executing scheduled campaign %s: %s", campaign.id, str(exc))

    return f"Processed {processed_count} scheduled campaigns."


@shared_task(name="apps.marketing.tasks.expire_promotions_and_coupons")
def expire_promotions_and_coupons():
    """
    Periodic task marking expired promotions and coupon codes based on end dates.
    """
    now = timezone.now()
    with transaction.atomic():
        expired_promos = Promotion.objects.filter(
            status__in=[PromotionStatus.ACTIVE, PromotionStatus.SCHEDULED],
            end_at__isnull=False,
            end_at__lt=now
        ).update(status=PromotionStatus.EXPIRED)

        expired_coupons = Coupon.objects.filter(
            status=CouponStatus.ACTIVE,
            valid_until__isnull=False,
            valid_until__lt=now
        ).update(status=CouponStatus.EXPIRED)

    return f"Expired {expired_promos} promotions and {expired_coupons} coupons."
