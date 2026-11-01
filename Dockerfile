# Multi-stage build untuk image Node.js produksi yang ramping dan aman
FROM node:20-alpine AS base

WORKDIR /app

# Install curl/wget untuk container health check
RUN apk add --no-cache curl

# Salin manifest dependensi
COPY package*.json ./

# Install hanya dependensi produksi (tanpa devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# Salin source code aplikasi
COPY src/ ./src/
COPY public/ ./public/
COPY db/ ./db/
COPY scripts/ ./scripts/

# Gunakan non-root user bawaan Node demi keamanan container
USER node

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "scripts/dev.js"]
