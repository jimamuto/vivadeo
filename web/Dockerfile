FROM node:22-alpine AS base

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY vite.config.ts tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 3000

ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", ".output/server/index.mjs"]
