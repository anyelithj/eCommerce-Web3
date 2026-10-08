// EmptyState.tsx => estado vacío con mensaje y acción sugerida (UX: nunca dejar una pantalla en blanco sin salida).
import { Link } from "../lib/i18n/navigation"; // Link con idioma (conserva /en al navegar)
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: { label: string; href: string };
  icon?: ReactNode;
}

export function EmptyState({ title, description, action, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
      {icon && (
        <div aria-hidden="true" className="text-4xl">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {description && <p className="max-w-sm text-sm text-slate-600">{description}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
