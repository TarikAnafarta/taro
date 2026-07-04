# ── Stage 1: Build dependencies ─────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools
RUN pip install --no-cache-dir uv

# Copy dependency manifests first for layer caching
COPY packages/taro-common/pyproject.toml packages/taro-common/pyproject.toml
COPY packages/taro-common/taro_common/ packages/taro-common/taro_common/
COPY services/taro-api/pyproject.toml services/taro-api/pyproject.toml

# Install dependencies
RUN cd services/taro-api && uv pip install --system --no-cache -e ../../packages/taro-common -e .

# ── Stage 2: Production image ──────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="taro" \
      service="taro-api"

# Create non-root user
RUN groupadd -r taro && useradd -r -g taro -d /app -s /sbin/nologin taro

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY packages/taro-common/taro_common/ /app/taro_common/
COPY services/taro-api/taro_api/ /app/taro_api/

# Switch to non-root user
USER taro

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()"

CMD ["uvicorn", "taro_api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
