"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiRequest } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-client";
import { useAuth } from "@/shared/hook/useAuth";
import type {
  CheckoutSession,
  OrderDetail,
  ShippingRate,
} from "@/entities/order/model/order.types";

export function useCheckout(id: string) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.checkout(id),
    queryFn: () =>
      apiGet<CheckoutSession>(`/checkout/${id}`, { token: accessToken, cache: "no-store" }),
    enabled: Boolean(accessToken),
  });
}

export function useInitCheckout() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (couponCode?: string) =>
      apiRequest<CheckoutSession>("/checkout", {
        method: "POST",
        token: accessToken,
        body: couponCode ? { couponCode } : {},
      }).then((response) => response.data),
    onSuccess: (session) => {
      queryClient.setQueryData(queryKeys.checkout(session.id), session);
      void queryClient.invalidateQueries({ queryKey: queryKeys.cart });
    },
  });
}

export function useUpdateCheckoutAddress(id: string) {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      addressId: string;
      shippingRateCode: string;
      couponCode?: string | null;
    }) =>
      apiRequest<CheckoutSession>(`/checkout/${id}/address`, {
        method: "PATCH",
        token: accessToken,
        body,
      }).then((response) => response.data),
    onSuccess: (session) => queryClient.setQueryData(queryKeys.checkout(id), session),
  });
}

export function useAbandonCheckout() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/checkout/${id}`, { method: "DELETE", token: accessToken }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.cart }),
  });
}

export function useShippingRates(
  addressId: string | null,
  weightGrams: number,
  subtotalCents: number
) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ["shipping-rates", addressId, weightGrams, subtotalCents],
    queryFn: () =>
      apiRequest<ShippingRate[]>("/shipping/rate", {
        method: "POST",
        token: accessToken,
        body: { addressId, weightGrams, subtotalCents },
      }).then((response) => response.data),
    enabled: Boolean(accessToken && addressId),
  });
}

export function usePlaceOrder() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (checkoutSessionId: string) =>
      apiRequest<OrderDetail>("/order", {
        method: "POST",
        token: accessToken,
        body: { checkoutSessionId },
      }).then((response) => response.data),
    retry: 10,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    onSuccess: (order) => {
      queryClient.setQueryData(queryKeys.order(order.id), order);
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
  return { ...mutation, ready: Boolean(accessToken) };
}
