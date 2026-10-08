"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiRequest } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-client";
import { useAuth } from "@/shared/hook/useAuth";
import type { Address, UserProfile } from "../model/user.types";
import type { ProductCard } from "@/entities/product/model/product.types";

export type AddressInput = Omit<Address, "id" | "isDefault" | "line2" | "label"> & {
  line2?: string | undefined;
  label?: string | undefined;
  isDefault?: boolean | undefined;
};

export const userApi = {
  profile: (token: string, userId: string) =>
    apiGet<UserProfile>(`/user/${userId}`, { token, cache: "no-store" }),
  updateProfile: (
    token: string,
    userId: string,
    body: Partial<Pick<UserProfile, "firstName" | "lastName" | "phone" | "avatarUrl" | "locale">>
  ) =>
    apiRequest<UserProfile>(`/user/${userId}`, { method: "PATCH", token, body }).then(
      (response) => response.data
    ),
  changePassword: (
    token: string,
    userId: string,
    body: { currentPassword: string; newPassword: string }
  ) => apiRequest(`/user/${userId}/password`, { method: "PATCH", token, body }),
  deleteAccount: (token: string, userId: string) =>
    apiRequest(`/user/${userId}`, { method: "DELETE", token }),
  createAddress: (token: string, userId: string, body: AddressInput) =>
    apiRequest<Address>(`/user/${userId}/addresses`, { method: "POST", token, body }).then(
      (response) => response.data
    ),
  updateAddress: (token: string, userId: string, addressId: string, body: Partial<AddressInput>) =>
    apiRequest<Address>(`/user/${userId}/addresses/${addressId}`, {
      method: "PATCH",
      token,
      body,
    }).then((response) => response.data),
  deleteAddress: (token: string, userId: string, addressId: string) =>
    apiRequest(`/user/${userId}/addresses/${addressId}`, { method: "DELETE", token }),
  wishlist: (token: string, userId: string) =>
    apiGet<ProductCard[]>(`/user/${userId}/wishlist`, { token, cache: "no-store" }),
  addToWishlist: (token: string, userId: string, productId: string) =>
    apiRequest<ProductCard[]>(`/user/${userId}/wishlist`, {
      method: "POST",
      token,
      body: { productId },
    }).then((response) => response.data),
  removeFromWishlist: (token: string, userId: string, productId: string) =>
    apiRequest<ProductCard[]>(`/user/${userId}/wishlist/${productId}`, {
      method: "DELETE",
      token,
    }).then((response) => response.data),
};

export function useProfile() {
  const { user, accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.profile(user?.id ?? "anonymous"),
    queryFn: () => userApi.profile(accessToken as string, (user as { id: string }).id),
    enabled: Boolean(user && accessToken),
  });
}

export function useWishlist() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.wishlist(user?.id ?? "anonymous");
  const query = useQuery({
    queryKey: key,
    queryFn: () => userApi.wishlist(accessToken as string, (user as { id: string }).id),
    enabled: Boolean(user && accessToken),
  });
  const toggle = useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved
        ? userApi.removeFromWishlist(accessToken as string, (user as { id: string }).id, productId)
        : userApi.addToWishlist(accessToken as string, (user as { id: string }).id, productId),
    onSuccess: (list) => queryClient.setQueryData(key, list),
  });
  return { ...query, toggle };
}
