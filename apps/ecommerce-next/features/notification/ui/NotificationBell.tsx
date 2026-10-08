// NotificationBell.tsx => campana del header: conteo de no leídas + escucha en tiempo real (GraphQL Subscription).
// Patrón Observer: al llegar un evento "notification" se invalida la cache y se muestra un toast.
"use client";

import { Link } from "@/shared/lib/i18n/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { NOTIFICATION_RECEIVED, useUnreadCount } from "../api/notification.api";
import { useLiveNotification } from "../model/notification.store";
import { NotificationToast } from "./NotificationToast";
import { useAuth } from "@/shared/hook/useAuth";
import { useWebSocket } from "@/shared/hook/useWebSocket";
import { routes } from "@/shared/constants/routes";

export function NotificationBell() {
  const t = useTranslations("notification");
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { receive } = useLiveNotification();
  const { data: unread = 0 } = useUnreadCount();

  // Suscripción WebSocket (solo con sesión): cada notificación nueva refresca el conteo y la bandeja
  useWebSocket(NOTIFICATION_RECEIVED, isAuthenticated, ({ notificationReceived }) => {
    receive(notificationReceived);
    void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["cart"] }); // Ej.: stock o precio pudieron cambiar
  });

  if (!isAuthenticated) return null;
  return (
    <>
      <Link
        href={routes.notifications}
        aria-label={t("bell", { count: unread })}
        className="relative flex h-10 w-10 items-center justify-center rounded-md hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-slate-900"
      >
        <span aria-hidden="true" className="text-xl">
          🔔
        </span>
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-semibold text-white"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </Link>
      <NotificationToast />
    </>
  );
}
