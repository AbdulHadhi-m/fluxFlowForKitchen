# Recipe Management & Bill of Materials (BOM)

The Recipe and BOM engine powers automated kitchen consumption, dish costing, preparation instructions, and recursive sub-recipe explosion.

---

## 1. Recipe Architecture & Versioning

- **Recipe Types**:
  - `MENU_ITEM_RECIPE`: Standard recipe directly mapped to a catalog `MenuItem`.
  - `SUB_RECIPE`: Intermediate pre-cooked batch (e.g. 5L Marinara Sauce, 10kg Pizza Dough) that can be included as an ingredient in multiple final dishes.
- **Versioning Lifecycle**:
  - `DRAFT`: In-development recipe adjustments by the Executive Chef.
  - `PUBLISHED`: Currently active authoritative recipe used for real-time inventory deductions on order placement.
  - `ARCHIVED`: Historical recipe version preserved for past order audit trails.
- **Effective Dating**: Supports time-bounded recipe versions for seasonal menus or promotional iterations.

---

## 2. Recursive BOM Explosion & Circular Dependency Protection

Sub-recipes can be nested to arbitrary depths (e.g. Dish -> Sauce -> Stock Base -> Spices).
To prevent infinite recursion:
- **DFS Cycle Detection**: When adding a sub-recipe to a BOM, a Depth-First Search algorithm verifies that no cycle exists in the Directed Acyclic Graph (DAG). If a loop is detected (e.g. Recipe A contains Recipe B, and Recipe B attempts to include Recipe A), the request is rejected with `ValidationError("Circular recipe dependency detected in BOM structure.")`.

---

## 3. Preparation & Cooking Yield Adjustments

Real-world kitchen preparation involves shrinkage, trimming loss, and cooking evaporation:
- **Preparation Loss %**: Peeling, boning, and trimming scrap (e.g. 10% loss on onions or whole fish).
- **Cooking Loss %**: Water evaporation during simmering, grilling, or roasting.
- **Yield Calculation Formula**:

$$\text{Effective Yield} = 1.00 - \frac{\text{Prep Loss \%} + \text{Cooking Loss \%}}{100}$$

$$\text{Total Production Cost} = \frac{\sum (\text{Ingredient Qty} \times \text{Unit Cost})}{\text{Effective Yield}}$$
