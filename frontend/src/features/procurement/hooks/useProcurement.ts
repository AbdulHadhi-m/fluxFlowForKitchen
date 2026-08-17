import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi } from "../api/procurement.api";

export const PROCUREMENT_KEYS = {
  suppliers: ["procurement", "suppliers"] as const,
  supplierDetail: (id: string) => ["procurement", "suppliers", id] as const,
  supplierItems: (id: string) => ["procurement", "suppliers", id, "items"] as const,
  supplierScorecard: (id: string) => ["procurement", "suppliers", id, "scorecard"] as const,
  requisitions: ["procurement", "requisitions"] as const,
  purchaseOrders: ["procurement", "purchase-orders"] as const,
  purchaseOrderDetail: (id: string) => ["procurement", "purchase-orders", id] as const,
  returns: ["procurement", "returns"] as const,
  credits: ["procurement", "credits"] as const,
  invoices: ["procurement", "invoices"] as const,
  budgets: ["procurement", "budgets"] as const,
  recommendations: ["procurement", "recommendations"] as const,
  reports: ["procurement", "reports"] as const,
};

export function useSuppliers(params?: { search?: string; is_active?: boolean; supplier_type?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.suppliers, params],
    queryFn: () => procurementApi.getSuppliers(params),
  });
}

export function useSupplierDetail(supplierId: string) {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.supplierDetail(supplierId),
    queryFn: () => procurementApi.getSupplierDetail(supplierId),
    enabled: Boolean(supplierId),
  });
}

export function useSupplierItems(supplierId: string) {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.supplierItems(supplierId),
    queryFn: () => procurementApi.getSupplierItems(supplierId),
    enabled: Boolean(supplierId),
  });
}

export function useSupplierScorecard(supplierId: string) {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.supplierScorecard(supplierId),
    queryFn: () => procurementApi.getSupplierScorecard(supplierId),
    enabled: Boolean(supplierId),
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.suppliers });
    },
  });
}

export function useAddSupplierContact(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => procurementApi.addSupplierContact(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.supplierDetail(supplierId) });
    },
  });
}

export function useUpsertSupplierItem(supplierId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => procurementApi.upsertSupplierItem(supplierId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.supplierItems(supplierId) });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.recommendations });
    },
  });
}

export function useRequisitions(params?: { status?: string; priority?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.requisitions, params],
    queryFn: () => procurementApi.getRequisitions(params),
  });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.createRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useSubmitRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.submitRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function useApproveRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.approveRequisition,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
    },
  });
}

export function usePurchaseOrders(params?: { status?: string; supplier_id?: string; search?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.purchaseOrders, params],
    queryFn: () => procurementApi.getPurchaseOrders(params),
  });
}

export function usePurchaseOrderDetail(poId: string) {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.purchaseOrderDetail(poId),
    queryFn: () => procurementApi.getPurchaseOrderDetail(poId),
    enabled: Boolean(poId),
  });
}

export function useCreatePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.requisitions });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.reports });
    },
  });
}

export function useSubmitPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.submitPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
    },
  });
}

export function useApprovePurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.approvePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.budgets });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.reports });
    },
  });
}

export function useSendPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.sendPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
    },
  });
}

export function useReceiveGoods() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ poId, data }: { poId: string; data: any }) => procurementApi.receiveGoods(poId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.reports });
    },
  });
}

export function useCancelPurchaseOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
    },
  });
}

export function usePurchaseReturns(params?: { supplier_id?: string; status?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.returns, params],
    queryFn: () => procurementApi.getPurchaseReturns(params),
  });
}

export function useCreatePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.createPurchaseReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.returns });
    },
  });
}

export function useApprovePurchaseReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.approvePurchaseReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.returns });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.credits });
      queryClient.invalidateQueries({ queryKey: ["inventory", "items"] });
    },
  });
}

export function useSupplierCredits(params?: { supplier_id?: string; status?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.credits, params],
    queryFn: () => procurementApi.getSupplierCredits(params),
  });
}

export function useSupplierInvoices(params?: { supplier_id?: string; match_status?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.invoices, params],
    queryFn: () => procurementApi.getSupplierInvoices(params),
  });
}

export function useSubmitSupplierInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.submitSupplierInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.invoices });
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.purchaseOrders });
    },
  });
}

export function useProcurementBudgets(params?: { location?: string }) {
  return useQuery({
    queryKey: [...PROCUREMENT_KEYS.budgets, params],
    queryFn: () => procurementApi.getProcurementBudgets(params),
  });
}

export function useCreateProcurementBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: procurementApi.createProcurementBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROCUREMENT_KEYS.budgets });
    },
  });
}

export function usePurchaseRecommendations() {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.recommendations,
    queryFn: () => procurementApi.getPurchaseRecommendations(),
  });
}

export function useProcurementReports() {
  return useQuery({
    queryKey: PROCUREMENT_KEYS.reports,
    queryFn: () => procurementApi.getProcurementReports(),
  });
}
