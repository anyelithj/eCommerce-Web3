// commitlint.config.js => valida el MENSAJE de cada commit antes de aceptarlo (hook commit-msg)
// Obliga a "Conventional Commits": tipo(alcance): descripción — ej. "feat(auth): agregar login OAuth2"
module.exports = {
  // "extends" => reutiliza el set de reglas oficial "conventional" en vez de reinventarlo (DRY)
  extends: ["@commitlint/config-conventional"],
  rules: {
    // "type-enum" => lista cerrada de tipos de commit permitidos
    "type-enum": [
      2, // 2 = nivel de severidad "error" (bloquea el commit si falla)
      "always", // "always" = la regla siempre debe cumplirse (vs "never")
      [
        "feat", // Nueva funcionalidad
        "fix", // Corrección de bug
        "docs", // Solo documentación
        "style", // Formato, sin cambios de lógica
        "refactor", // Cambio de código sin alterar comportamiento
        "perf", // Mejora de rendimiento
        "test", // Agregar o corregir tests
        "build", // Cambios en build system o dependencias
        "ci", // Cambios en pipelines CI/CD
        "chore", // Tareas de mantenimiento
        "revert", // Revertir un commit anterior
      ],
    ],
    // Máximo 100 caracteres en la primera línea del commit (legibilidad en git log)
    "header-max-length": [2, "always", 100],
  },
};
