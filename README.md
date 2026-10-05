# eCommerce Web3 Enterprise — Monorepo

Implementación de **Fase 0 (Setup & Arquitectura Base)** y **Fase 1 (Identity Domain: Auth · Users/Roles/Permissions · Next.js Auth Module)**,
según `docs/especificaciones/ecommerce_matriz_trazabilidad_v34.xlsx` y
`docs/especificaciones/ESPECIFICACION_TECNICA_UNIFICADA_VISION_ARQUITECTURA_eCommerce_Web3-Portafolio.docx`.

Paso a paso de instalación: [`docs/GUIA_DESPLIEGUE.md`](docs/GUIA_DESPLIEGUE.md).

## Estructura

```
ecommerce-web3-enterprise/            # UN solo repositorio git (pnpm workspaces + Turborepo)
├── apps/                             # Servicios desplegables: cada uno con su Dockerfile y .env.example
│   ├── ecommerce-express/            # Backend Node (N-Layer, Prisma)            — workspace pnpm
│   ├── ecommerce-fastapi/            # Backend Python (ML)                        — Poetry (fuera de pnpm)
│   ├── ecommerce-next/               # Frontend Next.js 15 (FSD)                  — workspace pnpm
│   └── ecommerce-nuxt/               # Frontend Nuxt (FSD)                        — workspace pnpm
├── packages/                         # Código compartido entre apps de Node
│   ├── eslint-config/                # Reglas ESLint (flat config) — la raíz y cada app las extienden
│   ├── tsconfig/                     # Presets TS strict: base.json, node.json, nextjs.json
│   └── shared-types/                 # Contratos TS de la API (ApiResponse, PaginatedResponse)
├── infra/
│   └── docker/                       # docker-compose.dev.yml + .env.example de infraestructura
├── docs/
│   ├── especificaciones/             # 01..05 *.md, ESPECIFICACION_TECNICA_*, matriz .xlsx
│   ├── setup/                        # 01..05 *_SETUP.md
│   └── GUIA_DESPLIEGUE.md
├── .github/workflows/ci.yml          # CI: lint · typecheck · test (Turborepo)
├── .husky/                           # Git hooks: pre-commit (lint-staged) · commit-msg (commitlint)
├── .lintstagedrc.json  .prettierrc.json  .prettierignore  commitlint.config.js  eslint.config.mjs
├── .gitignore  .gitattributes  .dockerignore
└── package.json  pnpm-lock.yaml  pnpm-workspace.yaml  turbo.json
```

## Comandos (desde la raíz, siempre con pnpm)

```bash
pnpm install          # dependencias de todas las apps Node + activa los hooks de Husky
pnpm dev:up           # Postgres (pgvector), MongoDB, Redis en Docker
pnpm dev              # apps Node en modo desarrollo (Turborepo)
pnpm lint | pnpm typecheck | pnpm test
pnpm dev:logs         # logs del compose
pnpm dev:down         # detiene los contenedores (conserva los datos)
docker compose -f infra/docker/docker-compose.dev.yml --profile app up --build   # + Express y Next en Docker
```
# eCommerce-Web3
