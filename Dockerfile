FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build \
    && mkdir -p .next/standalone/public .next/standalone/.next/static \
    && cp -R public/. .next/standalone/public/ \
    && cp -R .next/static/. .next/standalone/.next/static/

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# Include the CLI and TypeScript runtime so bootstrap/export/import also work in Docker.
COPY --from=build --chown=node:node /app ./
RUN mkdir -p /app/.data && chown node:node /app/.data
USER node
EXPOSE 3000
CMD ["node", ".next/standalone/server.js"]
