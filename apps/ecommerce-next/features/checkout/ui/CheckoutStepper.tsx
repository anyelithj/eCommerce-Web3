import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";

const STEPS = [{ key: "address" }, { key: "payment" }, { key: "confirm" }] as const;

export type CheckoutStep = (typeof STEPS)[number]["key"];

export function CheckoutStepper({ current }: { current: CheckoutStep }) {
  const t = useTranslations("checkout.steps");
  const currentIndex = STEPS.findIndex((step) => step.key === current);
  return (
    <nav aria-label={t("label")}>
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((step, index) => (
          <li
            key={step.key}
            aria-current={index === currentIndex ? "step" : undefined}
            className="flex flex-1 items-center gap-2"
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                index < currentIndex && "bg-green-600 text-white",
                index === currentIndex && "bg-primary text-primary-foreground",
                index > currentIndex && "bg-slate-200 text-slate-600"
              )}
            >
              {index < currentIndex ? "✓" : index + 1}
            </span>
            <span
              className={cn(
                index === currentIndex ? "font-semibold text-slate-900" : "text-slate-600"
              )}
            >
              {t(step.key)}
            </span>
            {index < STEPS.length - 1 && (
              <span aria-hidden="true" className="h-px flex-1 bg-slate-300" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
