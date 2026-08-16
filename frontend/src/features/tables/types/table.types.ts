export type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "OUT_OF_SERVICE";

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  section: string;
  status: TableStatus;
  status_display: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface TableCreatePayload {
  name: string;
  capacity?: number;
  section?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface TableUpdatePayload {
  name?: string;
  capacity?: number;
  section?: string;
  display_order?: number;
  is_active?: boolean;
}
