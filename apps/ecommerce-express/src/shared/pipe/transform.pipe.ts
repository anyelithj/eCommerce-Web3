// transform.pipe.ts => transformaciones de query string reutilizables (Zod preprocess).
// Los query params llegan como string o string[] ("?brand=a&brand=b"); estos helpers los normalizan.
import { z } from "zod";

// queryArray => acepta "a", "a,b" o ["a","b"] y siempre devuelve string[] (paradigma funcional: map/flatMap)
export const queryArray = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined; // Parámetro ausente => undefined
  const list = Array.isArray(value) ? value : [value]; // Normaliza a arreglo
  // "flatMap" => divide cada elemento por comas y aplana el resultado en un solo arreglo
  return list
    .flatMap((item) => String(item).split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(z.string()).optional());

// queryBoolean => "true"/"1" => true, "false"/"0" => false (z.coerce.boolean trataría "false" como true)
export const queryBoolean = z.preprocess((value) => {
  if (value === undefined) return undefined;
  return value === "true" || value === "1";
}, z.boolean().optional());
