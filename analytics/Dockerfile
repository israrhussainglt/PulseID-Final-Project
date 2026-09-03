# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
# better-sqlite3 (used to store bulletins) compiles a native module on
# install — these are the Alpine build tools node-gyp needs for that.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0
# Where the bulletins SQLite database lives — mount a volume here in
# docker-compose so generated bulletins survive container restarts.
ENV ANALYTICS_DATA_DIR=/app/data

RUN addgroup -S pulseid && adduser -S pulseid -G pulseid
RUN mkdir -p /app/data && chown pulseid:pulseid /app/data

COPY --from=build --chown=pulseid:pulseid /app/.next/standalone ./
COPY --from=build --chown=pulseid:pulseid /app/.next/static ./.next/static

USER pulseid

EXPOSE 3100
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.PORT || 3100) + '/login', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
