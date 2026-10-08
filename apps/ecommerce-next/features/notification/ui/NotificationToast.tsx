// NotificationToast.tsx => aviso emergente de una notificación en tiempo real (región aria-live polite).
"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/shared/lib/i18n/navigation";
import { useLiveNotification } from "../model/notification.store";
import { NOTIFICATION_META } from "../lib/notification.validator";

export function NotificationToast() {
  const t = useTranslations("notification");
  const { latest, dismiss } = useLiveNotification();

  useEffect(() => {
    if (!latest) return;
    const timer = setTimeout(dismiss, 6000); // Se oculta sola; el historial queda en la bandeja
    return () => clearTimeout(timer);
  }, [latest, dismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-20 z-50 w-80">
      {latest && (
        <div className="pointer-events-auto flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-lg">
          <span aria-hidden="true" className="text-xl">
            {NOTIFICATION_META[latest.type].icon}
          </span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-900">{latest.title}</p>
            <p className="text-slate-600">{latest.body}</p>
            {latest.url && (
              <Link
                href={latest.url}
                onClick={() => dismiss()}
                className="mt-1 inline-block font-medium underline"
              >
                {t("viewDetail")}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss()}
            aria-label={t("dismiss")}
            className="self-start text-slate-400 hover:text-slate-700"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
