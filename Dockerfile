# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source files
COPY . .

# Pass build-time env vars
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_ENCRYPTION_KEY
ARG VITE_MSAL_CLIENT_ID
ARG VITE_MSAL_TENANT_ID
ARG VITE_API_URL

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ENCRYPTION_KEY=$VITE_SUPABASE_ENCRYPTION_KEY
ENV VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID
ENV VITE_MSAL_TENANT_ID=$VITE_MSAL_TENANT_ID
ENV VITE_API_URL=$VITE_API_URL

# Build the Vite app
RUN npm run build

# ── Production stage ──────────────────────────────────────
FROM nginx:stable-alpine AS production

# Copy custom nginx config template
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Verify built assets (will show in build logs)
RUN ls -la /usr/share/nginx/html

# Default port to listen on (Render provides this)
ENV PORT=80

# Use envsubst to replace $PORT in the template and start nginx
CMD ["/bin/sh", "-c", "envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

