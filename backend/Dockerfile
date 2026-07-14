FROM node:20-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps

FROM base AS builder
RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* tsconfig.json ./
COPY prisma ./prisma
COPY scripts ./scripts
COPY src ./src
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install --yes --no-install-recommends openssl fonts-noto-core \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/dist ./dist

RUN groupadd --system app && useradd --system --gid app --create-home app \
  && mkdir -p /app/storage /app/backups \
  && chown app:app /app/storage /app/backups

USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000

CMD ["node", "dist/server.js"]
