FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY apps/ecommerce-next/package.json ./apps/ecommerce-next/
RUN pnpm install --frozen-lockfile --filter ecommerce-next...

FROM deps AS development
COPY apps/ecommerce-next ./apps/ecommerce-next
WORKDIR /repo/apps/ecommerce-next
EXPOSE 3000
CMD ["pnpm", "run", "dev"]

FROM development AS build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN pnpm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build /repo/apps/ecommerce-next/.next/standalone ./
COPY --from=build /repo/apps/ecommerce-next/.next/static ./apps/ecommerce-next/.next/static
COPY --from=build /repo/apps/ecommerce-next/public ./apps/ecommerce-next/public
USER node
EXPOSE 3000
CMD ["node", "apps/ecommerce-next/server.js"]
