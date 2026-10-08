// run-if-installed.mjs => ejecuta una herramienta de formato SOLO si está instalada en el equipo.
// Uso (desde .lintstagedrc.json): node scripts/run-if-installed.mjs cargo fmt -- <archivos>
// Motivo: el monorepo mezcla Node, Rust y Python; quien solo trabaja en Next.js no debe instalar Rust para poder
// hacer commit. Si falta la herramienta se avisa y se omite; la CI de GitHub Actions sí la exige (cargo fmt --check, ruff).
import { spawnSync } from "node:child_process"; // Ejecuta procesos hijos de forma síncrona (lint-staged espera el resultado)

// "process.argv" => [node, script, herramienta, ...argumentos]; destructuring separa la herramienta del resto
const [, , tool, ...args] = process.argv;

// "--version" => comprobación barata de que el binario existe en el PATH; "shell: true" resuelve .exe/.cmd en Windows
const probe = spawnSync(tool, ["--version"], { stdio: "ignore", shell: true });
if (probe.status !== 0) {
  console.warn(`[lint-staged] "${tool}" no está instalado: se omite (la CI lo valida). Instálalo para formatear localmente.`);
  process.exit(0); // 0 => no bloquea el commit
}

// "stdio: inherit" => la salida de la herramienta se ve en la terminal; se propaga su código de salida
const result = spawnSync(tool, args, { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
