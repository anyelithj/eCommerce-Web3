FROM node:20-alpine AS base
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ecommerce-express/package.json ./apps/ecommerce-express/
RUN pnpm install --frozen-lockfile --filter ecommerce-express...

FROM deps AS development
COPY apps/ecommerce-express ./apps/ecommerce-express
WORKDIR /repo/apps/ecommerce-express
RUN pnpm exec prisma generate
EXPOSE 4000
CMD ["pnpm", "run", "dev"]

FROM development AS build
RUN pnpm run build
WORKDIR /repo
RUN pnpm --filter ecommerce-express deploy --prod /prod
RUN cd /prod && /repo/apps/ecommerce-express/node_modules/.bin/prisma generate --schema /repo/apps/ecommerce-express/prisma/schema.prisma

FROM node:20-alpine AS production
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /prod/package.json ./
COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /repo/apps/ecommerce-express/dist ./dist
COPY --from=build /repo/apps/ecommerce-express/prisma ./prisma
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
