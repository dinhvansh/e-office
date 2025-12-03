FROM node:20-alpine
WORKDIR /app

# Install dependencies (including devDependencies for build)
COPY package.json package-lock.json* .npmrc* ./
RUN npm install --include=dev --legacy-peer-deps || npm install --include=dev

# Copy source and build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]
