FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts ./
COPY src ./src
COPY web ./web
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY src ./src
COPY --from=build /app/web/dist ./web/dist
USER node
EXPOSE 3000
CMD ["node", "src/server.ts"]
