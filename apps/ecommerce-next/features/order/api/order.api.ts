// order.api.ts => pedidos del usuario (lista/detalle), cancelación, devoluciones y descarga de factura.
"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiGet, apiRequest } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-client";
import { useAuth } from "@/shared/hook/useAuth";
import { config } from "@/shared/constants/config";
import type { PaginationMeta } from "@/shared/types/api.types";
import type { OrderDetail, OrderStatus, OrderSummary } from "@/entities/order/model/order.types";
import type { RefundFormValues } from "../lib/order.validator";

export function useOrders(params: { page: number; status?: OrderStatus | undefined }) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () =>
      apiRequest<OrderSummary[]>("/order", {
        token: accessToken,
        query: { page: params.page, limit: 10, status: params.status },
      }) as Promise<{ data: OrderSummary[]; meta?: PaginationMeta }>,
    enabled: Boolean(accessToken),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => apiGet<OrderDetail>(`/order/${id}`, { token: accessToken, cache: "no-store" }),
    enabled: Boolean(accessToken),
    // Mientras el pedido está en tránsito se refresca cada minuto (el tracking cambia)
    refetchInterval: (query) =>
      query.state.data && ["SHIPPED", "PACKED"].includes(query.state.data.status) ? 60_000 : false,
  });
}

// useCancelOrder => DELETE /order/:id (solo antes del envío; el backend reembolsa automáticamente)
export function useCancelOrder(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiRequest<OrderDetail>(`/order/${id}`, {
        method: "DELETE",
        token: accessToken,
        body: { reason },
      }).then((response) => response.data),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(id), order);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// useRequestRefund => POST /refund (devolución de un pedido entregado)
export function useRequestRefund(orderId: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: RefundFormValues) =>
      apiRequest("/refund", { method: "POST", token: accessToken, body: { ...values, orderId } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.order(orderId) }),
  });
}

// downloadInvoice => el PDF requiere Authorization: se descarga con fetch y se abre como blob (no un <a href> directo)
export async function downloadInvoice(
  invoiceId: string,
  number: string,
  token: string
): Promise<void> {
  const response = await fetch(`${config.apiUrl}/invoice/${invoiceId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("No se pudo descargar la factura");
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: `factura-${number}.pdf`,
  });
  link.click();
  URL.revokeObjectURL(url); // Libera la memoria del blob
}
