export type UnitOfMeasure =
  | 'kg'
  | 'g'
  | 'l'
  | 'ml'
  | 'piece'
  | 'portion'
  | 'pack'
  | 'bottle'
  | 'box'
  | 'oz'
  | 'lb';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export type ItemType =
  | 'RAW_INGREDIENT'
  | 'PACKAGING'
  | 'CONSUMABLE'
  | 'SEMI_FINISHED'
  | 'FINISHED_GOOD';

export type StorageLocation =
  | 'MAIN_STORE'
  | 'KITCHEN'
  | 'BAR'
  | 'WALK_IN_FREEZER'
  | 'DRY_STORAGE'
  | 'OTHER';

export type StorageCondition = 'AMBIENT' | 'REFRIGERATED' | 'FROZEN' | 'DRY';

export type MovementType =
  | 'OPENING'
  | 'PURCHASE'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'CONSUMPTION'
  | 'WASTAGE'
  | 'SPOILAGE'
  | 'RETURN'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'PRODUCTION_IN'
  | 'PRODUCTION_OUT';

export type RecipeStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type RecipeType = 'MENU_ITEM_RECIPE' | 'SUB_RECIPE' | 'PREPARATION_BATCH';

export type CountStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'CANCELLED';
export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export type WasteReason =
  | 'SPOILAGE'
  | 'PREPARATION_WASTE'
  | 'DAMAGED'
  | 'SPILLAGE'
  | 'OVER_PORTIONING'
  | 'BURNT_OVERCOOKED'
  | 'CUSTOMER_RETURN'
  | 'OTHER';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  item_type: ItemType;
  unit: UnitOfMeasure;
  purchase_unit: UnitOfMeasure;
  purchase_to_stock_factor: string;
  storage_location: StorageLocation;
  storage_condition: StorageCondition;
  current_quantity: string;
  minimum_stock_level: string;
  par_level: string;
  max_stock_level: string;
  cost_per_unit: string;
  last_purchase_cost: string;
  weighted_average_cost: string;
  yield_percentage: string;
  track_expiry: boolean;
  track_batch: boolean;
  is_active: boolean;
  stock_status: StockStatus;
  total_valuation: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryBatch {
  id: string;
  item: string;
  item_name: string;
  item_unit: string;
  batch_number: string;
  received_date: string;
  expiry_date?: string | null;
  initial_quantity: string;
  current_quantity: string;
  unit_cost: string;
  supplier_name?: string;
  storage_location: string;
  batch_status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED';
  created_at: string;
}

export interface StockMovement {
  id: string;
  item: string;
  item_name: string;
  batch?: string | null;
  movement_type: MovementType;
  movement_type_display: string;
  quantity: string;
  quantity_before: string;
  quantity_after: string;
  unit: UnitOfMeasure;
  unit_cost_snapshot: string;
  reference_type: string;
  reference_id: string;
  reason: string;
  created_by_name: string;
  created_at: string;
}

export interface RecipeItem {
  id: string;
  inventory_item?: string | null;
  inventory_item_name?: string;
  sub_recipe?: string | null;
  sub_recipe_name?: string;
  quantity: string;
  unit: UnitOfMeasure;
  preparation_notes?: string;
}

export interface Recipe {
  id: string;
  name: string;
  version: number;
  status: RecipeStatus;
  recipe_type: RecipeType;
  menu_item?: string | null;
  menu_item_name?: string;
  output_quantity: string;
  output_unit: UnitOfMeasure;
  yield_percentage: string;
  preparation_loss_pct: string;
  cooking_loss_pct: string;
  effective_from?: string | null;
  effective_until?: string | null;
  instructions: string;
  notes: string;
  calculated_cost: string;
  ingredients: RecipeItem[];
  created_at: string;
  updated_at: string;
}

export interface StockCountItem {
  id: string;
  item: string;
  item_name: string;
  item_unit: string;
  system_quantity: string;
  counted_quantity: string;
  variance_quantity: string;
  unit_cost: string;
  variance_value: string;
  notes?: string;
}

export interface StockCount {
  id: string;
  count_number: string;
  status: CountStatus;
  location: string;
  category: string;
  counted_by_name: string;
  approved_by_name: string;
  counted_at?: string | null;
  approved_at?: string | null;
  notes: string;
  items: StockCountItem[];
  created_at: string;
}

export interface InventoryTransferItem {
  id: string;
  item: string;
  item_name: string;
  quantity: string;
  unit: UnitOfMeasure;
  notes?: string;
}

export interface InventoryTransfer {
  id: string;
  transfer_number: string;
  source_location: StorageLocation;
  destination_location: StorageLocation;
  status: TransferStatus;
  requested_by_name: string;
  approved_by_name: string;
  received_by_name: string;
  requested_at: string;
  approved_at?: string | null;
  received_at?: string | null;
  notes: string;
  items: InventoryTransferItem[];
  created_at: string;
}

export interface WasteRecord {
  id: string;
  item: string;
  item_name: string;
  batch?: string | null;
  quantity: string;
  unit: UnitOfMeasure;
  reason: WasteReason;
  unit_cost: string;
  total_loss_cost: string;
  location: string;
  reported_by_name: string;
  notes: string;
  created_at: string;
}

export interface FoodCostAnalysis {
  has_recipe: boolean;
  recipe_id?: string | null;
  recipe_name?: string;
  version?: number;
  recipe_cost: string;
  selling_price: string;
  food_cost_percentage: string;
  gross_margin: string;
  margin_percentage: string;
  suggested_price_30_pct?: string;
  suggested_price_25_pct?: string;
  ingredients: Array<{
    item_id: string;
    item_name: string;
    quantity: string;
    unit: string;
    unit_cost: string;
    line_cost: string;
  }>;
}

export interface InventoryValuation {
  total_valuation: string;
  total_items_count: number;
  by_location: Record<string, string>;
  by_type: Record<string, string>;
}

export interface VarianceAnalysisItem {
  item_id: string;
  item_name: string;
  unit: string;
  theoretical_quantity: string;
  actual_quantity: string;
  variance_quantity: string;
  unit_cost: string;
  variance_cost: string;
  possible_causes: string;
}

export interface VarianceAnalysis {
  total_theoretical_cost: string;
  total_actual_cost: string;
  net_variance_cost: string;
  items: VarianceAnalysisItem[];
}

export interface ReorderSuggestion {
  item_id: string;
  item_name: string;
  sku: string;
  unit: string;
  purchase_unit: string;
  current_quantity: string;
  pending_inbound_quantity: string;
  minimum_stock_level: string;
  par_level: string;
  suggested_reorder_quantity: string;
  estimated_purchase_cost: string;
  stock_status: StockStatus;
}
