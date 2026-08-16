import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { procurementApi } from "../api/procurement.api";
import {
  CreateSupplierPayload,
  CreatePurchaseOrderPayload,
  ReceiveGoodsPayload,
} from "../types/procurement.types";
import { useAuthStore } from "@/features/auth/store/authStore";

export const useProcurement = (searchQuery?: string, statusFilter?: string, supplierId?: string) => {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Suppliers query
  const suppliersQuery = useQuery({
    queryKey: ["suppliers", searchQuery],
    queryFn: () => procurementApi.getSuppliers(searchQuery),
    enabled: isAuthenticated,
  });

  // Purchase Orders query
  const purchaseOrdersQuery = useQuery({
    queryKey: ["purchaseOrders", searchQuery, statusFilter, supplierId],
    queryFn: () => procurementApi.getPurchaseOrders(searchQuery, statusFilter, supplierId),
    enabled: isAuthenticated,
  });

  // Create Supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (payload: CreateSupplierPayload) => procurementApi.createSupplier(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });

  // Create PO mutation
  const createPOMutation = useMutation({
    mutationFn: (payload: CreatePurchaseOrderPayload) => procurementApi.createPurchaseOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });

  // Submit PO mutation
  const submitPOMutation = useMutation({
    mutationFn: (id: string) => procurementApi.submitPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });

  // Approve PO mutation
  const approvePOMutation = useMutation({
    mutationFn: (id: string) => procurementApi.approvePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });

  // Cancel PO mutation
  const cancelPOMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      procurementApi.cancelPurchaseOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });

  // Receive Goods mutation
  const receiveGoodsMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReceiveGoodsPayload }) =>
      procurementApi.receiveGoods(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["inventoryItems"] });
      queryClient.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });

  return {
    suppliers: suppliersQuery.data?.data || [],
    isLoadingSuppliers: suppliersQuery.isLoading,
    purchaseOrders: purchaseOrdersQuery.data?.data || [],
    isLoadingPOs: purchaseOrdersQuery.isLoading,
    createSupplier: createSupplierMutation.mutateAsync,
    isCreatingSupplier: createSupplierMutation.isPending,
    createPO: createPOMutation.mutateAsync,
    isCreatingPO: createPOMutation.isPending,
    submitPO: submitPOMutation.mutateAsync,
    isSubmittingPO: submitPOMutation.isPending,
    approvePO: approvePOMutation.mutateAsync,
    isApprovingPO: approvePOMutation.isPending,
    cancelPO: cancelPOMutation.mutateAsync,
    isCancellingPO: cancelPOMutation.isPending,
    receiveGoods: receiveGoodsMutation.mutateAsync,
    isReceivingGoods: receiveGoodsMutation.isPending,
  };
};
