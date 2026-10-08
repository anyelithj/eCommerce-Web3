// date.util.ts => aritmética de fechas pura e inmutable (siempre devuelve un Date NUEVO, nunca muta el recibido).
const MINUTE_MS = 60_000; // "_" separador numérico de ES2021: solo mejora la legibilidad
const DAY_MS = 24 * 60 * MINUTE_MS;

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * MINUTE_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

// yyyymmdd => formato compacto para números de orden ("20260929")
export function yyyymmdd(date: Date): string {
  // "toISOString()" => "2026-09-29T12:00:00.000Z" (UTC); se toman los 10 primeros caracteres sin guiones
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
