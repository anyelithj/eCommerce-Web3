import { z } from "zod";

export const queryArray = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  const list = Array.isArray(value) ? value : [value];
  return list
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()).optional());

export const queryBoolean = z.preprocess((value) => {
  if (value === undefined) return undefined;
  return value === "true" || value === "1";
}, z.boolean().optional());
