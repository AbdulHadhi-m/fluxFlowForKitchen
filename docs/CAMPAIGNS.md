# Marketing Campaigns & Audience Broadcasts

## Overview
Campaigns allow restaurants to engage their diner base via automated in-app alerts, email notifications, and SMS text messages.

## Delivery Pipeline

1. **Targeting**:
   - Dynamic Segment evaluation (`CustomerSegmentService.get_segment_customers_queryset`).
2. **Consent Enforcement**:
   - Queries `MarketingConsent` table for customer opt-in on requested channel.
   - If not `GRANTED`, skips delivery and increments `skipped_count`.
3. **Idempotency Guarantee**:
   - Deduplication key: `{campaign_id}:{customer_id}:{channel}`.
   - Prevents duplicate delivery during retries.
4. **Template Personalization**:
   - Replaces `{customer_name}` and `{promo_name}` with contextual data.
5. **Delivery Logging**:
   - Creates `CampaignDeliveryLog` with timestamp, status (`DELIVERED` / `FAILED`), and audit trail.
