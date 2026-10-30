FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build

FROM node:24-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends libjemalloc2 \
  && rm -rf /var/lib/apt/lists/* \
  && ln -s "/usr/lib/$(uname -m)-linux-gnu/libjemalloc.so.2" /usr/lib/libjemalloc.so.2
WORKDIR /app
ENV NODE_ENV=production PORT=3000 LD_PRELOAD=/usr/lib/libjemalloc.so.2 \
  MALLOC_CONF=background_thread:true,dirty_decay_ms:1000,muzzy_decay_ms:0
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY --from=build /app/web/dist ./web/dist
USER node
EXPOSE 3000
CMD ["node", "src/server.ts"]
