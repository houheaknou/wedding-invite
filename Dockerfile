# syntax=docker/dockerfile:1
# Production image for the wedding app (Next.js standalone + Prisma). Targets:
#   runner  — the app (default), non-root, health-checked
#   migrate — one-shot `prisma migrate deploy` (see docker-compose.prod.yml)
# NEXT_PUBLIC_APP_URL is baked into the browser bundle, so it is a build argument.

FROM node:22-bookworm-slim AS base
# Prisma's query engine needs OpenSSL
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies (cached while package files and schema are unchanged); postinstall runs prisma generate
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
ARG NEXT_PUBLIC_APP_URL=""
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

# One-shot migrations: has the Prisma CLI and the migrations folder
FROM deps AS migrate
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# uploaded music lives here — mount a volume on it (compose: `uploads`)
RUN mkdir -p /app/uploads/music && chown -R node:node /app/uploads
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
