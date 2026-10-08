import { spawnSync } from "node:child_process";

const [, , tool, ...args] = process.argv;

const probe = spawnSync(tool, ["--version"], { stdio: "ignore", shell: true });
if (probe.status !== 0) {
  console.warn(
    `[lint-staged] "${tool}" no está instalado: se omite (la CI lo valida). Instálalo para formatear localmente.`
  );
  process.exit(0);
}

const result = spawnSync(tool, args, { stdio: "inherit", shell: true });
process.exit(result.status ?? 1);
