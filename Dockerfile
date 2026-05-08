FROM node:20-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/ client/
COPY server/ server/

RUN npm ci
RUN npm run build -w client

FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/ server/
COPY --from=builder /app/client/dist/ client/dist/
COPY --from=builder /app/node_modules/ node_modules/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
