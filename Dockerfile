# --- Stage 1: build the Vite/React frontend ---
FROM node:20-slim AS frontend
WORKDIR /frontend

# Copy lockfiles + manifest first for layer caching
COPY ["Paper Compass/package.json", "Paper Compass/package-lock.json", "./"]
RUN npm ci --no-audit --no-fund

# Copy the rest and build
COPY ["Paper Compass/", "./"]
# Default API base = /api (same-origin) so we don't need to bake any URL.
RUN npm run build


# --- Stage 2: backend with frontend static bundled in ---
FROM python:3.11-slim AS backend
WORKDIR /app

# System deps:
#   build-essential / libpq-dev — psycopg, asyncpg native bits
#   libxml2-dev / libxslt1-dev — lxml
#   libcairo2 — cairosvg (SVG → PNG rendering for visuals)
#   curl — health probes / debugging
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential libpq-dev libxml2-dev libxslt1-dev libcairo2 curl \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies via pyproject.toml (hatchling needs the package source present)
COPY backend/pyproject.toml backend/README.md* /app/
COPY backend/app /app/app
RUN pip install --no-cache-dir /app

# Migrations + entrypoint
COPY backend/alembic /app/alembic
COPY backend/alembic.ini /app/alembic.ini
COPY backend/start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Frontend build artifact (mounted by FastAPI as static)
COPY --from=frontend /frontend/dist /app/static

ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["/app/start.sh"]
