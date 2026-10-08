// KPICard.tsx => tarjeta de indicador con valor, tendencia contra el período anterior y descripción accesible.
// Patrón Factory (el formato del valor depende del tipo: dinero, número o porcentaje). Server-friendly: sin estado.
// Accesibilidad: la tendencia no depende solo del color (flecha + texto "sube/baja" para lectores de pantalla).
import { cn } from "@/shared/lib/cn";

interface KPICardProps {
  label: string;
  value: string; // Ya formateado por quien llama (moneda/idioma)
  change?: number | undefined; // Variación relativa (0.12 = +12 %); undefined => sin comparación
  trendLabel?: string | undefined; // "vs. período anterior"
  invert?: boolean; // true => bajar es bueno (ej. devoluciones pendientes)
}

export function KPICard({ label, value, change, trendLabel, invert = false }: KPICardProps) {
  const up = (change ?? 0) > 0;
  const good = change === undefined || change === 0 ? null : invert ? !up : up;
  const percent = change === undefined ? null : `${up ? "+" : ""}${(change * 100).toFixed(1)} %`;
  return (
    <article className="flex flex-col gap-1 rounded-lg border bg-background p-4 shadow-sm">
      <h3 className="text-sm font-medium text-slate-600">{label}</h3>
      <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
      {percent && (
        <p
          className={cn(
            "text-xs font-medium",
            good === null ? "text-slate-500" : good ? "text-green-700" : "text-red-700"
          )}
        >
          <span aria-hidden="true">{up ? "▲" : change === 0 ? "■" : "▼"}</span> {percent}
          {trendLabel && <span className="font-normal text-slate-500"> {trendLabel}</span>}
        </p>
      )}
    </article>
  );
}
