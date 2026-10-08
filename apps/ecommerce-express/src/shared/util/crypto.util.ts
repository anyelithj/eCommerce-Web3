// crypto.util.ts => primitivas criptográficas compartidas (Node "crypto" nativo, sin dependencias).
import crypto from "node:crypto";

// sha256 => hash determinista para GUARDAR tokens (refresh, verificación, OTP) sin almacenarlos en claro.
// A diferencia de bcrypt, es rápido y permite buscar por igualdad (columna UNIQUE): adecuado para tokens
// aleatorios de alta entropía (no para contraseñas humanas, que sí usan bcrypt).
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// sha384 => requerido por el anexo técnico de la DIAN para calcular CUFE/CUDE
export function sha384(value: string): string {
  return crypto.createHash("sha384").update(value).digest("hex");
}

// safeEqual => comparación en tiempo constante (evita ataques de timing al comparar secretos)
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  // "timingSafeEqual" exige longitudes iguales; si difieren, ya sabemos que no coinciden
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

// randomCode => código alfanumérico legible (sin 0/O/1/I ambiguos) para números de orden y cupones
export function randomCode(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  // "Array.from({ length }, fn)" => genera un arreglo de N elementos de forma funcional
  return Array.from({ length }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
}
