FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json* .npmrc* ./
RUN npm install --legacy-peer-deps || npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

EXPOSE 5000
CMD ["node", "dist/server.js"]
