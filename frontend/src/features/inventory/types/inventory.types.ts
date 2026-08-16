export type UnitOfMeasure = "kg" | "g" | "l" | "ml" | "piece" | "pack" | "bottle" | "box";
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
export type MovementType =
  | "OPENING"
  | "PURCHASE"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "CONSUMPTION"
  | "WASTAGE"
  | "RETURN";

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  unit: UnitOfMeasure;
  current_quantity: string;
  minimum_stock_level: string;
  cost_per_unit: string;
  is_active: boolean;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  movement_type: MovementType;
  movement_type_display: string;
  quantity: string;
  quantity_before: string;
  quantity_after: string;
  unit: UnitOfMeasure;
  reference_type: string;
  reference_id: string;
  reason: string;
  created_by_name: string;
  created_at: string;
}

export interface RecipeItem {
  id: string;
  inventory_item: string;
  inventory_item_name: string;
  quantity: string;
  unit: UnitOfMeasure;
}

export interface Recipe {
  id: string;
  menu_item: string;
  menu_item_name: string;
  yield_quantity: number;
  instructions: string;
  ingredients: RecipeItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryItemPayload {
  name: string;
  sku?: string;
  unit: UnitOfMeasure;
  minimum_stock_level?: number;
  cost_per_unit?: number;
  initial_quantity?: number;
}

export interface ReceiveStockPayload {
  quantity: number;
  unit: UnitOfMeasure;
  reference?: string;
  reason?: string;
}

export interface AdjustStockPayload {
  delta_quantity: number;
  reason: string;
}

export interface WastagePayload {
  quantity: number;
  reason?: string;
}
