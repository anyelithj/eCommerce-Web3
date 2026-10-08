// check-messages.mjs => valida los diccionarios de i18n (messages/es.json y en.json) antes de desplegar:
//   1. ambos idiomas tienen EXACTAMENTE las mismas claves (ninguna pantalla queda a medio traducir)
//   2. cada mensaje es ICU válido (plurales, variables {x}, etiquetas <strong>) y usa las mismas variables en ambos
// Se ejecuta con: pnpm i18n:check  (Node puro + el parser ICU que ya trae next-intl; sin dependencias nuevas)
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// El parser ICU es dependencia transitiva de next-intl: se resuelve desde su ubicación (pnpm no lo expone directo)
const require = createRequire(import.meta.resolve("next-intl"));
const { parse, TYPE } = require("@formatjs/icu-messageformat-parser");

const load = (lang) => JSON.parse(readFileSync(new URL(`../messages/${lang}.json`, import.meta.url), "utf8"));

// flatten => { a: { b: "x" } } -> { "a.b": "x" } (los arreglos, como los beneficios por nivel, son hojas)
const flatten = (node, prefix = "") =>
  Object.entries(node).flatMap(([key, value]) =>
    value && typeof value === "object" && !Array.isArray(value) ? flatten(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]
  );

// variables => nombres de argumentos usados por el mensaje (recursivo: plurales anidados y etiquetas)
const variables = (ast, found = new Set()) => {
  for (const node of ast) {
    if (node.type === TYPE.argument || node.type === TYPE.number || node.type === TYPE.plural || node.type === TYPE.select) found.add(node.value);
    if (node.options) Object.values(node.options).forEach((option) => variables(option.value, found));
    if (node.type === TYPE.tag) variables(node.children, found);
  }
  return found;
};

const es = new Map(flatten(load("es")));
const en = new Map(flatten(load("en")));
const errors = [];

for (const key of new Set([...es.keys(), ...en.keys()])) {
  if (!es.has(key) || !en.has(key)) {
    errors.push(`${key}: falta en ${es.has(key) ? "en" : "es"}`);
    continue;
  }
  const [a, b] = [es.get(key), en.get(key)];
  if (Array.isArray(a) || Array.isArray(b)) continue; // Listas de texto plano (t.raw)
  try {
    const [va, vb] = [variables(parse(a)), variables(parse(b))];
    const same = va.size === vb.size && [...va].every((name) => vb.has(name));
    if (!same) errors.push(`${key}: variables distintas es=[${[...va]}] en=[${[...vb]}]`);
  } catch (error) {
    errors.push(`${key}: ICU inválido (${error.message})`);
  }
}

console.log(`${es.size} mensajes por idioma revisados`);
if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("OK: diccionarios completos y consistentes");
