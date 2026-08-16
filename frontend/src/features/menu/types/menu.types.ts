export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name: string;
  name: string;
  description: string;
  price: string;
  is_available: boolean;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MenuCategoryCreatePayload {
  name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface MenuCategoryUpdatePayload {
  name?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface MenuItemCreatePayload {
  category_id: string;
  name: string;
  description?: string;
  price: string;
  is_available?: boolean;
  is_active?: boolean;
  display_order?: number;
}

export interface MenuItemUpdatePayload {
  category_id?: string;
  name?: string;
  description?: string;
  price?: string;
  is_available?: boolean;
  is_active?: boolean;
  display_order?: number;
}
