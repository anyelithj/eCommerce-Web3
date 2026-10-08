// NotifSettings.tsx => preferencias por canal (interruptores role="switch" accesibles). Cada cambio se guarda al instante.
"use client";

import { useTranslations } from "next-intl";
import { usePreferences, type NotificationPreferences } from "../api/settings.api";
import { Skeleton } from "@/shared/ui/Skeleton";
import { toast } from "@/shared/ui/Toast";
import { useErrorMessage } from "@/shared/hook/useErrorMessage";
import { cn } from "@/shared/lib/cn";

// Canales configurables; título y descripción salen de messages/*.json -> settings.notifications.<canal>
const OPTIONS: Array<keyof NotificationPreferences> = ["inApp", "email", "push", "marketing"];

export function NotifSettings() {
  const t = useTranslations("settings.notifications");
  const errorMessage = useErrorMessage();
  const { data: prefs, isLoading, update } = usePreferences();
  if (isLoading || !prefs) return <Skeleton className="h-48 w-full" />;

  return (
    <ul className="flex flex-col divide-y divide-slate-200">
      {OPTIONS.map((key) => {
        const checked = prefs[key];
        return (
          <li key={key} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p id={`pref-${key}`} className="font-medium text-slate-900">
                {t(`${key}.label`)}
              </p>
              <p className="text-sm text-slate-600">{t(`${key}.description`)}</p>
            </div>
            {/* role="switch" + aria-checked => interruptor on/off anunciado correctamente (WAI-ARIA Switch pattern) */}
            <button
              type="button"
              role="switch"
              aria-checked={checked}
              aria-labelledby={`pref-${key}`}
              disabled={update.isPending}
              onClick={() =>
                update.mutate(
                  { [key]: !checked },
                  { onError: (error) => toast.error(errorMessage(error)) }
                )
              }
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2",
                checked ? "bg-slate-900" : "bg-slate-300"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                  checked ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
