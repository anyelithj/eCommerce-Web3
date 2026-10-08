# Dockerfile (Docker) => multi-stage build para una app dentro de un monorepo pnpm.
# Se construye con contexto = RAÍZ del monorepo (ver docker-compose.dev.yml):
#   docker build -f apps/ecommerce-express/Dockerfile --target production -t ecommerce-express .
# Patrón "Builder" (multi-stage): cada stage tiene UNA responsabilidad (SRP) y la imagen final solo lleva lo necesario.

# ---------- STAGE BASE: runtime común ----------
FROM node:20-alpine AS base
# "apk add openssl" => Prisma necesita OpenSSL en Alpine para su query engine
RUN apk add --no-cache openssl
# "corepack enable" => activa la versión EXACTA de pnpm declarada en "packageManager" del package.json raíz
RUN corepack enable
# "WORKDIR" => carpeta de trabajo; replica la raíz del monorepo dentro del container
WORKDIR /repo

# ---------- STAGE DEPS: instala SOLO las dependencias de esta app ----------
FROM base AS deps
# Copia primero SOLO los manifiestos => la capa de "pnpm install" se cachea mientras no cambien dependencias
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ecommerce-express/package.json ./apps/ecommerce-express/
# "--filter ecommerce-express..." => instala esta app + sus paquetes internos del workspace (no Next/Nuxt)
# "--frozen-lockfile" => falla si el lockfile no coincide (builds reproducibles, igual que en CI)
RUN pnpm install --frozen-lockfile --filter ecommerce-express...

# ---------- STAGE DEVELOPMENT: usado por docker-compose.dev.yml (target: development) ----------
FROM deps AS development
COPY apps/ecommerce-express ./apps/ecommerce-express
WORKDIR /repo/apps/ecommerce-express
# Genera el cliente tipado de Prisma a partir de prisma/schema.prisma
RUN pnpm exec prisma generate
EXPOSE 4000
# ts-node-dev con --respawn => reinicia el proceso al detectar cambios (bind mount del compose)
CMD ["pnpm", "run", "dev"]

# ---------- STAGE BUILD: compila TypeScript -> JavaScript y aísla dependencias de producción ----------
FROM development AS build
RUN pnpm run build
WORKDIR /repo
# "pnpm deploy --prod" => copia la app con un node_modules plano SOLO de "dependencies" (sin devDependencies)
RUN pnpm --filter ecommerce-express deploy --prod /prod
# Regenera el cliente Prisma dentro de /prod (el CLI "prisma" es devDependency, por eso se usa el del workspace)
RUN cd /prod && /repo/apps/ecommerce-express/node_modules/.bin/prisma generate --schema /repo/apps/ecommerce-express/prisma/schema.prisma

# ---------- STAGE PRODUCTION: imagen final mínima ----------
FROM node:20-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/package.json ./
COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /repo/apps/ecommerce-express/dist ./dist
COPY --from=build /repo/apps/ecommerce-express/prisma ./prisma
# "USER node" => no corre como root (principio de mínimo privilegio, seguridad)
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
