# ==========================================
# Multi-stage Dockerfile for Utsav Planner
# ==========================================

# Stage 1: Build & Dependencies
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies (utilizing .npmrc)
COPY package.json package-lock.json* .npmrc ./
RUN npm install

# Copy source assets
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server/ ./server/
COPY server.ts ./

# Build production assets
RUN npm run build

# Remove development dependencies to keep final layer lean
RUN npm prune --omit=dev

# Stage 2: Production Runner
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Alpine node user has UID 1000
USER node

# Copy built application and production dependencies
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/server ./server
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/src/schemas ./src/schemas
COPY --chown=node:node --from=builder /app/src/utils ./src/utils
COPY --chown=node:node --from=builder /app/src/types ./src/types

EXPOSE ${PORT}

# Health check using Alpine's native wget
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:${PORT:-3000}/api/health || exit 1

CMD ["npm", "start"]
