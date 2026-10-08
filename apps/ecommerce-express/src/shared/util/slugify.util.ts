// slugify.util.ts => genera slugs SEO-friendly ("Camisa Niño Azul" -> "camisa-nino-azul"). Función pura.
import crypto from "node:crypto"; // Módulo nativo de Node: bytes aleatorios para desambiguar slugs repetidos

export function slugify(text: string): string {
  return (
    text
      // "normalize('NFD')" => separa letras y tildes ("ñ" -> "n" + "~") para luego eliminar las marcas diacríticas
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // Rango Unicode de marcas diacríticas combinables
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "") // Quita todo lo que no sea letra, número, espacio o guion
      .replace(/[\s_-]+/g, "-") // Espacios/guiones repetidos => un solo guion
      .replace(/^-+|-+$/g, "") // Sin guiones al inicio o al final
  );
}

// uniqueSlug => slug + sufijo corto aleatorio; se usa cuando el slug base ya existe (evita violar el UNIQUE)
export function uniqueSlug(text: string): string {
  return `${slugify(text)}-${crypto.randomBytes(3).toString("hex")}`;
}
