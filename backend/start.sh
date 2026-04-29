#!/bin/sh
set -e
echo "[start.sh] running alembic upgrade head"
alembic upgrade head
echo "[start.sh] launching uvicorn on port ${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
