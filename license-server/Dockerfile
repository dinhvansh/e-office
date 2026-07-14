FROM node:20-alpine
WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* .npmrc* ./
RUN npm ci --include=dev --legacy-peer-deps

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

RUN addgroup -S app && adduser -S app -G app && chown -R app:app /app
USER app

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

EXPOSE 5000
CMD ["node", "dist/server.js"]
