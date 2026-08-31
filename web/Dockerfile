FROM node:22-alpine AS base

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY next.config.mjs tsconfig.json next-env.d.ts ./
COPY middleware.ts ./
COPY styles ./styles
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY public ./public

RUN npm run build
RUN mkdir -p .next/standalone/.next \
  && cp -r .next/static .next/standalone/.next/static \
  && cp -r public .next/standalone/public

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", ".next/standalone/server.js"]
