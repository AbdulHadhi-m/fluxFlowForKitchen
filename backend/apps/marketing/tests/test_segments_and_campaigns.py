import pytest
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta
from apps.restaurants.models import Restaurant
from apps.accounts.models import User
from apps.customers.models import Customer, CustomerTag
from apps.marketing.models import (
    CustomerSegment,
    CustomerSegmentType,
    MarketingConsent,
    ConsentChannel,
    ConsentStatus,
    Campaign,
    CampaignStatus,
    CampaignChannel,
    Promotion,
    PromotionType,
    PromotionStatus,
)
from apps.marketing.services import (
    CustomerSegmentService,
    MarketingConsentService,
    CampaignService,
    MarketingAnalyticsService,
)


@pytest.mark.django_db
class TestSegmentsCampaignsAndConsent:

    @pytest.fixture(autouse=True)
    def setup_data(self):
        self.restaurant = Restaurant.objects.create(name="Campaign Bistro", slug="campaign-bistro")
        self.user = User.objects.create_user(email="marketer@bistro.com", password="Password123")

        self.vip_tag = CustomerTag.objects.create(restaurant=self.restaurant, name="VIP")
        self.cust_vip = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="VIP",
            last_name="Customer",
            phone="9990001111",
            total_spend=Decimal("8000.00"),
            total_visits=10,
            last_visit_at=timezone.now()
        )
        self.cust_vip.tags.add(self.vip_tag)

        self.cust_inactive = Customer.objects.create(
            restaurant=self.restaurant,
            first_name="Inactive",
            last_name="User",
            phone="9990002222",
            total_spend=Decimal("50.00"),
            total_visits=1,
            last_visit_at=timezone.now() - timedelta(days=90)
        )

    def test_dynamic_segment_evaluation(self):
        vip_segment = CustomerSegment.objects.create(
            restaurant=self.restaurant,
            name="VIP Club",
            segment_type=CustomerSegmentType.VIP_CUSTOMERS,
            min_spend=Decimal("5000.00")
        )
        vip_audience = CustomerSegmentService.get_segment_customers_queryset(vip_segment)
        assert self.cust_vip in vip_audience
        assert self.cust_inactive not in vip_audience

        inactive_segment = CustomerSegment.objects.create(
            restaurant=self.restaurant,
            name="Lapsed Diners",
            segment_type=CustomerSegmentType.INACTIVE_CUSTOMERS,
            inactive_days=60
        )
        inactive_audience = CustomerSegmentService.get_segment_customers_queryset(inactive_segment)
        assert self.cust_inactive in inactive_audience
        assert self.cust_vip not in inactive_audience

    def test_marketing_consent_tracking(self):
        # Set consent
        consent = MarketingConsentService.set_consent(
            restaurant=self.restaurant,
            customer=self.cust_vip,
            channel=ConsentChannel.EMAIL,
            status=ConsentStatus.GRANTED,
            actor_user=self.user
        )
        assert consent.status == ConsentStatus.GRANTED
        assert MarketingConsentService.get_consent(self.cust_vip, ConsentChannel.EMAIL) is True

        # Revoke consent
        MarketingConsentService.set_consent(
            restaurant=self.restaurant,
            customer=self.cust_vip,
            channel=ConsentChannel.EMAIL,
            status=ConsentStatus.REVOKED,
            actor_user=self.user
        )
        assert MarketingConsentService.get_consent(self.cust_vip, ConsentChannel.EMAIL) is False

    def test_campaign_launch_and_idempotency(self):
        # Grant push consent
        MarketingConsentService.set_consent(
            restaurant=self.restaurant,
            customer=self.cust_vip,
            channel=ConsentChannel.PUSH,
            status=ConsentStatus.GRANTED,
            actor_user=self.user
        )

        segment = CustomerSegment.objects.create(
            restaurant=self.restaurant,
            name="VIP Broadcast",
            segment_type=CustomerSegmentType.VIP_CUSTOMERS
        )

        campaign = Campaign.objects.create(
            restaurant=self.restaurant,
            name="Weekend Flash Deal",
            status=CampaignStatus.DRAFT,
            target_segment=segment,
            channel=CampaignChannel.IN_APP,
            title="Special Chef Tasting",
            message_template="Hello {customer_name}, enjoy tasting menu!",
            start_at=timezone.now()
        )

        res1 = CampaignService.launch_campaign(campaign=campaign, actor_user=self.user)
        assert res1["sent_count"] >= 1
        assert res1["status"] == CampaignStatus.COMPLETED

        # Re-running same campaign respects idempotency (no duplicate sends)
        campaign.status = CampaignStatus.DRAFT
        campaign.save()
        res2 = CampaignService.launch_campaign(campaign=campaign, actor_user=self.user)
        # Should be skipped due to idempotency key
        assert res2["skipped_count"] >= 1
