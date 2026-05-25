FROM node:20-slim AS builder
WORKDIR /app

# better-sqlite3 (a transitive dep of mem0ai/oss) ships prebuilt binaries
# for common targets but falls back to compiling from source when it can't
# find one for the build host. The compile step needs python3 + a C++
# toolchain, neither of which is in node:20-slim. Install them here so
# `npm ci` succeeds. The build-stage image is discarded at the next FROM
# so production runtime stays slim.
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

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
