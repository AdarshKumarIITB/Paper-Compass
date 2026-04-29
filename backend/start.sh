#!/bin/sh
set -e

echo "============================================================"
echo "[start.sh] container booting"
echo "[start.sh] commit: ${RAILWAY_GIT_COMMIT_SHA:-unknown}"
echo "[start.sh] PORT=${PORT:-8000}"
echo "[start.sh] DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo yes || echo NO)"
echo "[start.sh] ANTHROPIC_API_KEY set: $([ -n "$ANTHROPIC_API_KEY" ] && echo yes || echo NO)"
echo "[start.sh] JWT_SECRET set: $([ -n "$JWT_SECRET" ] && echo yes || echo NO)"
echo "[start.sh] static dir contents:"
ls -la /app/static 2>&1 | head -10 || echo "  (no /app/static)"
echo "============================================================"

echo "[start.sh] running alembic upgrade head"
alembic upgrade head

echo "[start.sh] launching uvicorn on 0.0.0.0:${PORT:-8000}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --log-level info --access-log
