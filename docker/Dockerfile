# Multi-stage build for career-ops service
# Includes Node.js, Chromium (for Playwright), and TeX Live (for PDF generation)

FROM node:20-bookworm AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    # Chromium dependencies for Playwright
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    # TeX Live for PDF generation
    texlive-latex-base \
    texlive-latex-extra \
    texlive-fonts-recommended \
    texlive-xetex \
    fonts-liberation \
    # Utilities
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy Prisma schema and generate client
RUN npx prisma generate

# Production image
FROM base AS production

ENV NODE_ENV=production

# Create non-root user
RUN useradd -m -u 1001 appuser

# Copy application code
COPY --chown=appuser:appuser \
    src/ ./src/ \
    modes/ ./modes/ \
    templates/ ./templates/ \
    fonts/ ./fonts/

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

# Start server
CMD ["node", "src/server/index.ts"]

# Development image
FROM base AS development

ENV NODE_ENV=development

# Copy all source files
COPY . .

# Install dev dependencies
RUN npm ci

# Expose port
EXPOSE 3000

# Enable ts-node for development
CMD ["npm", "run", "dev"]
