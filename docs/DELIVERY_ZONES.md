# Delivery Zones & Pricing Rules

## 1. Zone Matching Strategy
When an order or estimation request arrives with a customer postal code:
1. Active zones for the restaurant are queried ordered by `priority DESC` (highest priority first).
2. The customer's normalized postal code is matched against `zone.postal_codes` (supports exact match or prefix matching like `"100"` matching `"10001"`).
3. If no custom zone matches, the default restaurant settings fee and radius parameters are applied as a fallback.

## 2. Fee Calculation Rules
- **Minimum Order**: If `order_subtotal < zone.minimum_order`, delivery is rejected with an eligibility error.
- **Free Delivery Threshold**: If `order_subtotal >= restaurant_config.free_delivery_threshold`, delivery fee is `$0.00`.
- **Zone Fee**: Otherwise, the zone's base `fee` is billed on checkout and passed to the invoice.

## 3. Estimating Delivery Windows
Delivery windows combine kitchen prep buffer with courier transit time:
```
Total Window = Kitchen Buffer (e.g. 15-20m) + Zone Estimated Transit (e.g. 20-30m)
```
Formatted in customer responses as e.g. `"35-45 minutes"`.
