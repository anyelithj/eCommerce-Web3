// NotificationList.tsx => bandeja completa: filtro leídas/no leídas, marcar como leída, eliminar y limpiar.
"use client";

import { Link } from "@/shared/lib/i18n/navigation";
import { useState } from "react";
import { useNotificationActions, useNotifications } from "../api/notification.api";
import { NOTIFICATION_META } from "../lib/notification.validator";
import { useTranslations } from "next-intl";
import { useFormat } from "@/shared/hook/useFormat";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Skeleton } from "@/shared/ui/Skeleton";

export function NotificationList() {
  const t = useTranslations("notification");
  const { dateTime } = useFormat();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isLoading } = useNotifications(page, unreadOnly);
  const { markRead, markAllRead, remove, clear } = useNotificationActions();
  const items = data?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked);
              setPage(1);
            }}
          />
          {t("unreadOnly")}
        </label>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            loading={markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            {t("markAllRead")}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            loading={clear.isPending}
            onClick={() => clear.mutate()}
          >
            {t("clear")}
          </Button>
        </div>
      </div>
      {isLoading && <Skeleton className="h-40 w-full" />}
      {!isLoading && items.length === 0 && (
        <EmptyState icon="🔔" title={t("emptyTitle")} description={t("emptyDescription")} />
      )}
      <ul className="flex flex-col divide-y divide-slate-200">
        {items.map((notification) => (
          <li
            key={notification.id}
            className={cn("flex gap-3 py-3", !notification.read && "bg-blue-50/50")}
          >
            <span aria-hidden="true" className="text-xl">
              {NOTIFICATION_META[notification.type].icon}
            </span>
            <div className="flex-1 text-sm">
              <p className="font-medium text-slate-900">
                {!notification.read && <span className="sr-only">{t("unread")}: </span>}
                {notification.title}
              </p>
              <p className="text-slate-600">{notification.body}</p>
              <p className="text-xs text-slate-500">
                {t(`types.${notification.type}`)} ·{" "}
                <time dateTime={notification.createdAt}>{dateTime(notification.createdAt)}</time>
              </p>
              <div className="mt-1 flex gap-3">
                {notification.url && (
                  <Link
                    href={notification.url}
                    onClick={() => !notification.read && markRead.mutate(notification.id)}
                    className="text-xs font-medium underline"
                  >
                    {t("viewDetail")}
                  </Link>
                )}
                {!notification.read && (
                  <button
                    type="button"
                    onClick={() => markRead.mutate(notification.id)}
                    className="text-xs underline"
                  >
                    {t("markRead")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(notification.id)}
                  className="text-xs text-red-600 underline"
                >
                  {t("delete")}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex justify-between">
          <Button
            size="sm"
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            {t("previous")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage(page + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}
    </div>
  );
}
