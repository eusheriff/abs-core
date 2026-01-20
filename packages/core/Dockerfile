# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Build typescript to dist
RUN npm run build

# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Don't run as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Install only production deps
RUN npm ci --only=production

# Create volume dir and set permissions
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data
VOLUME /app/data

USER nextjs

ENV PORT=3000
ENV DATABASE_URL=/app/data/abs_core.db

EXPOSE 3000

CMD ["node", "dist/api/server.js"]
