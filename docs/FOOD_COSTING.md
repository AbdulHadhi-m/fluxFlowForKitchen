# Food Costing, Pricing Optimization & Variance Analysis

Fluxiflow provides analytical tools for kitchen management to analyze profit margins, variance losses, and price optimization.

---

## 1. Food Cost & Gross Margin Metrics

For any menu item with a published BOM recipe:

- **Food Cost Percentage**:

$$\text{Food Cost \%} = \left( \frac{\text{Recipe Cost}}{\text{Selling Price}} \right) \times 100$$

- **Gross Margin**:

$$\text{Gross Margin (\$)} = \text{Selling Price} - \text{Recipe Cost}$$

- **Target Price Recommendation**:
  - Given a target food cost percentage (e.g. 28% for casual dining or 22% for bar/beverage):

$$\text{Suggested Price} = \frac{\text{Recipe Cost}}{\text{Target \%} / 100}$$

---

## 2. Theoretical vs. Actual Food Cost Variance

1. **Theoretical Consumption ($C_{\text{theo}}$)**:
   - Sum of (Completed Order Item Count $\times$ Recipe BOM Ingredient Quantity $\times$ Ingredient Unit Cost).
2. **Actual Consumption ($C_{\text{act}}$)**:
   - Sum of physical deductions from the immutable stock movement ledger:
     $\text{Actual Consumption} = \text{Opening Balance} + \text{Purchases} - \text{Closing Balance}$ (or sum of POS consumption + Waste + Spoilage movements).
3. **Variance Gap & Shrinkage Attribution**:

$$\text{Variance Loss (\$)} = C_{\text{act}} - C_{\text{theo}}$$

Positive variances highlight kitchen shrinkage, over-portioning on the line, undocumented scrap, or unrecorded customer re-makes.

---

## 3. Ingredient Cost Change Simulation (Impact Analysis)

When supplier commodity prices rise (e.g. dairy prices spike by 15%), managers can run a simulation on that ingredient:
- The system recursively identifies all dishes and sub-recipes containing that raw item.
- Calculates the new estimated dish cost, margin compression ($), and suggests adjusted selling prices to protect target food cost percentages.
