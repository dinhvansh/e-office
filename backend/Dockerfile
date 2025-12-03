FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Production image - Run with ts-node (no build needed)
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=development

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev deps for ts-node)
RUN npm ci --legacy-peer-deps && npm cache clean --force

# Copy application code
COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

# Create storage directory
RUN mkdir -p /app/storage /app/backups

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 4000

# Run with ts-node in transpileOnly mode (no type checking)
CMD ["npx", "ts-node", "--transpile-only", "src/server.ts"]
