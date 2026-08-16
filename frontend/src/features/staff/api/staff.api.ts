import { apiClient } from "@/lib/api-client";
import { StaffMember, StaffCreatePayload, StaffUpdatePayload } from "../types/staff.types";

interface PaginatedStaffResponse {
  success: boolean;
  meta: {
    count: number;
    total_pages: number;
    current_page: number;
    page_size: number;
    next: string | null;
    previous: string | null;
  };
  data: StaffMember[];
}

export const staffApi = {
  async getStaffList(params?: {
    page?: number;
    status?: string;
    role?: string;
    search?: string;
  }): Promise<PaginatedStaffResponse> {
    const response = await apiClient.get<PaginatedStaffResponse>("/staff/", { params });
    return response.data;
  },

  async getStaffDetail(staffId: string): Promise<{ success: boolean; data: StaffMember }> {
    const response = await apiClient.get<{ success: boolean; data: StaffMember }>(`/staff/${staffId}/`);
    return response.data;
  },

  async createStaff(data: StaffCreatePayload): Promise<{ success: boolean; data: StaffMember }> {
    const response = await apiClient.post<{ success: boolean; data: StaffMember }>("/staff/", data);
    return response.data;
  },

  async updateStaff(
    staffId: string,
    data: StaffUpdatePayload
  ): Promise<{ success: boolean; data: StaffMember }> {
    const response = await apiClient.patch<{ success: boolean; data: StaffMember }>(
      `/staff/${staffId}/`,
      data
    );
    return response.data;
  },

  async disableStaff(staffId: string): Promise<{ success: boolean; data: StaffMember }> {
    const response = await apiClient.post<{ success: boolean; data: StaffMember }>(
      `/staff/${staffId}/disable/`
    );
    return response.data;
  },

  async reactivateStaff(staffId: string): Promise<{ success: boolean; data: StaffMember }> {
    const response = await apiClient.post<{ success: boolean; data: StaffMember }>(
      `/staff/${staffId}/reactivate/`
    );
    return response.data;
  },
};
