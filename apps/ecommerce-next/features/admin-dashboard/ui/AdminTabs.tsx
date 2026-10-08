// AdminTabs.tsx (Client Component) => pestañas accesibles de las secciones del panel (pedidos/envíos/facturas...).
// Patrón WAI-ARIA Tabs: role="tablist"/"tab"/"tabpanel", flechas izquierda/derecha para moverse (roving tabindex).
// La pestaña activa vive en Redux (Client State) => se conserva al navegar entre secciones del panel.
// Rendimiento: solo se monta el panel activo (las demás pestañas no consultan la API hasta abrirse).
"use client";

import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useAdminDashboard } from "../model/dashboard.store";
import { cn } from "@/shared/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  render: () => ReactNode; // Función (no nodo): el contenido se crea solo para la pestaña activa (lazy)
}

export function AdminTabs({
  section,
  tabs,
  label,
}: {
  section: string;
  tabs: TabItem[];
  label: string;
}) {
  const { tabs: active, setTab } = useAdminDashboard();
  const current = tabs.find((tab) => tab.id === active[section]) ?? tabs[0];
  const baseId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  // onKeyDown => flechas cambian de pestaña y mueven el foco (patrón de teclado WAI-ARIA)
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    const next = (index + delta + tabs.length) % tabs.length;
    const tab = tabs[next];
    if (!tab) return;
    setTab({ section, tab: tab.id });
    refs.current[next]?.focus();
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label={label}
        className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 lg:mx-0 lg:px-0"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                refs.current[index] = element;
              }}
              id={`${baseId}-tab-${tab.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1} // Roving tabindex: Tab entra a la pestaña activa; las flechas recorren
              onClick={() => setTab({ section, tab: tab.id })}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "shrink-0 border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${current?.id ?? ""}`}
        tabIndex={0}
        className="focus-visible:outline-none"
      >
        {current?.render()}
      </div>
    </div>
  );
}
