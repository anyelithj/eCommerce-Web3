# Dockerfile (Docker) => multi-stage: dev (hot-reload) vs producción (output "standalone", imagen mínima).
# Se construye con contexto = RAÍZ del monorepo (ver docker-compose.dev.yml):
#   docker build -f apps/ecommerce-next/Dockerfile --target production -t ecommerce-next .

# ---------- STAGE BASE ----------
FROM node:20-alpine AS base
# "corepack enable" => usa la versión de pnpm fijada en "packageManager" (misma en local, CI y Docker)
RUN corepack enable
WORKDIR /repo

# ---------- STAGE DEPS: solo manifiestos => capa cacheable ----------
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ecommerce-next/package.json ./apps/ecommerce-next/
# "--filter ecommerce-next..." => instala solo Next + sus paquetes internos del workspace
RUN pnpm install --frozen-lockfile --filter ecommerce-next...

# ---------- STAGE DEVELOPMENT: usado por docker-compose.dev.yml (target: development) ----------
FROM deps AS development
COPY apps/ecommerce-next ./apps/ecommerce-next
WORKDIR /repo/apps/ecommerce-next
EXPOSE 3000
# "next dev" con Fast Refresh: los cambios en app/, features/, shared/ se reflejan sin reiniciar
CMD ["pnpm", "run", "dev"]

# ---------- STAGE BUILD ----------
FROM development AS build
# "ARG" => valores que llegan con "docker build --build-arg" (o build-args en la CI). Las NEXT_PUBLIC_* se incrustan en el
# JavaScript del navegador AL CONSTRUIR: cambiarlas después en el .env del servidor no tiene efecto (hay que reconstruir)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# "ENV" => las expone a "next build" (config.ts usa localhost como respaldo si llegan vacías)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN pnpm run build

# ---------- STAGE PRODUCTION: usa el output "standalone" (ver next.config.ts) ----------
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
# "HOSTNAME=0.0.0.0" => el server standalone escucha en todas las interfaces (necesario dentro de Docker)
ENV HOSTNAME=0.0.0.0
# En monorepo, "standalone" replica la ruta apps/ecommerce-next/ (outputFileTracingRoot = raíz del repo)
COPY --from=build /repo/apps/ecommerce-next/.next/standalone ./
COPY --from=build /repo/apps/ecommerce-next/.next/static ./apps/ecommerce-next/.next/static
COPY --from=build /repo/apps/ecommerce-next/public ./apps/ecommerce-next/public
# "USER node" => no corre como root (mínimo privilegio)
USER node
EXPOSE 3000
CMD ["node", "apps/ecommerce-next/server.js"]
