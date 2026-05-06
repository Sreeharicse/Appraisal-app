# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . .

# Pass build-time env vars
COPY .env .env
# Build the Vite app
RUN npm run build

# ── Production stage ─────────────────────────────ocker─────────
FROM nginx:stable-alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Verify built assets (will show in build logs)
RUN ls -la /usr/share/nginx/html

EXPOSE 10000

CMD ["nginx", "-g", "daemon off;"]

