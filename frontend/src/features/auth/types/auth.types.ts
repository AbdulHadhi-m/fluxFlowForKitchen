export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  is_active: boolean;
  is_staff: boolean;
  last_login: string | null;
  created_at: string;
}

export interface UserSession {
  id: string;
  ip_address: string | null;
  device_info: string;
  is_current: boolean;
  created_at: string;
  last_activity: string;
  expires_at: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    session_id: string;
  };
}

export interface RefreshResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
    session_id: string;
  };
}

export interface GenericMessageResponse {
  success: boolean;
  data: {
    message: string;
  };
}
