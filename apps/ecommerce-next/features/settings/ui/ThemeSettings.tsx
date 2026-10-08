"use client";

import { useTranslations } from "next-intl";
import { useDisplayPreferences, type TextSize } from "../model/settings.store";

const SIZES: TextSize[] = ["normal", "large", "x-large"];

export function ThemeSettings() {
  const t = useTranslations("settings.display");
  const { textSize, reduceMotion, setTextSize, setReduceMotion } = useDisplayPreferences();
  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="mb-2 font-medium text-slate-900">{t("textSize")}</legend>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <label
              key={size}
              className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900"
            >
              <input
                type="radio"
                name="text-size"
                value={size}
                checked={textSize === size}
                onChange={() => setTextSize(size)}
                className="sr-only"
              />
              {t(`sizes.${size}`)}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={reduceMotion}
          onChange={(event) => setReduceMotion(event.target.checked)}
        />
        {t("reduceMotion")}
      </label>
    </div>
  );
}
