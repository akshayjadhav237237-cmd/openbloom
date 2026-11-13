# Production Dockerfile for OpenBloom on Google Cloud Run
FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy project files
COPY --chown=appuser:appgroup package.json ./
COPY --chown=appuser:appgroup server.js ./
COPY --chown=appuser:appgroup lib/ ./lib/
COPY --chown=appuser:appgroup public/ ./public/
COPY --chown=appuser:appgroup docs/ ./docs/
COPY --chown=appuser:appgroup scripts/ ./scripts/

# Set up writable data directory for non-root user
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

USER appuser

# Environment defaults
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
