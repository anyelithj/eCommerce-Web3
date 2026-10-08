// notification.api.ts => bandeja de notificaciones, conteo de no leídas y preferencias por canal (REST con Axios)
// + notificaciones en tiempo real (GraphQL Subscription "notificationReceived" por WebSocket).
"use client";

import { gql, type TypedDocumentNode } from "@apollo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiRequest } from "@/shared/lib/api-client";
import { queryKeys } from "@/shared/lib/query-client";
import { useAuth } from "@/shared/hook/useAuth";
import type { PaginationMeta } from "@/shared/types/api.types";

export interface AppNotification {
  id: string;
  type:
    | "ORDER"
    | "PAYMENT"
    | "SHIPPING"
    | "REFUND"
    | "REVIEW"
    | "LOYALTY"
    | "SECURITY"
    | "PROMOTION"
    | "SYSTEM";
  title: string;
  body: string;
  url: string | null;
  read: boolean;
  createdAt: string;
}

// NOTIFICATION_RECEIVED => el servidor empuja cada notificación nueva del usuario autenticado (Observer)
export const NOTIFICATION_RECEIVED: TypedDocumentNode<
  { notificationReceived: AppNotification },
  Record<string, never>
> = gql`
  subscription NotificationReceived {
    notificationReceived {
      id
      type
      title
      body
      url
      read
      createdAt
    }
  }
`;

export function useNotifications(page: number, unreadOnly = false) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.notifications({ page, unreadOnly }),
    queryFn: () =>
      apiRequest<AppNotification[]>("/notification", {
        token: accessToken,
        query: { page, limit: 15, unread: unreadOnly ? "true" : undefined },
      }) as Promise<{ data: AppNotification[]; meta?: PaginationMeta }>,
    enabled: Boolean(accessToken),
  });
}

export function useUnreadCount() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: () =>
      apiGet<{ unreadCount: number }>("/notification/unread-count", {
        token: accessToken,
        cache: "no-store",
      }).then((data) => data.unreadCount),
    enabled: Boolean(accessToken),
    refetchInterval: 120_000, // Respaldo por si el WebSocket se desconecta
  });
}

// useNotificationActions => marcar leída(s) y borrar; invalidan bandeja y conteo (["notifications"] cubre ambos)
export function useNotificationActions() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["notifications"] });
  return {
    markRead: useMutation({
      mutationFn: (id: string) =>
        apiRequest(`/notification/${id}/read`, { method: "PATCH", token: accessToken }),
      onSuccess: refresh,
    }),
    markAllRead: useMutation({
      mutationFn: () =>
        apiRequest("/notification/read-all", { method: "PATCH", token: accessToken }),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (id: string) =>
        apiRequest(`/notification/${id}`, { method: "DELETE", token: accessToken }),
      onSuccess: refresh,
    }),
    clear: useMutation({
      mutationFn: () => apiRequest("/notification", { method: "DELETE", token: accessToken }),
      onSuccess: refresh,
    }),
  };
}

// (Las preferencias por canal viven en features/settings: son configuración de la cuenta)
