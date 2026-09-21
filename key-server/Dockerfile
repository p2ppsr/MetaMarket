FROM node:24.21.0-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json jest.config.js ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --from=build --chown=10001:10001 /app/node_modules ./node_modules
COPY --from=build --chown=10001:10001 /app/dist ./dist
USER 10001:10001
EXPOSE 3000
CMD ["node", "--max-http-header-size=10485760", "dist/src/index.js"]
