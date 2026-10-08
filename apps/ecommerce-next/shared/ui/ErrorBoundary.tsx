// ErrorBoundary.tsx (React class component) => aísla fallos de un widget: si un componente hijo lanza al
// renderizar, se muestra un fallback en su lugar y el resto de la página sigue funcionando (resiliencia de UI).
// Es clase porque React solo expone componentDidCatch/getDerivedStateFromError en componentes de clase.
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslations } from "next-intl";

// DefaultFallback => componente funcional aparte: las clases no pueden usar hooks (useTranslations)
function DefaultFallback() {
  const t = useTranslations("common");
  return (
    <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
      {t("sectionError")}
    </p>
  );
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = { hasError: false };

  // "static getDerivedStateFromError" => actualiza el estado para mostrar el fallback en el siguiente render
  public static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // "componentDidCatch" => punto para registrar el error (Sentry/Datadog) sin romper la UI
  public override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  public override render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback ?? <DefaultFallback />;
    }
    return this.props.children;
  }
}
