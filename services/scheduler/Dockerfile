# ── Stage 1: Build dependencies ─────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools
RUN pip install --no-cache-dir uv

# Copy dependency manifests first for layer caching
COPY packages/taro-common/pyproject.toml packages/taro-common/pyproject.toml
COPY packages/taro-common/taro_common/ packages/taro-common/taro_common/
COPY services/scheduler/pyproject.toml services/scheduler/pyproject.toml

# Install dependencies
RUN cd services/scheduler && uv pip install --system --no-cache -e ../../packages/taro-common -e .

# ── Stage 2: Production image ──────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="taro" \
      service="scheduler"

# Create non-root user
RUN groupadd -r taro && useradd -r -g taro -d /app -s /sbin/nologin taro

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY packages/taro-common/taro_common/ /app/taro_common/
COPY services/scheduler/scheduler/ /app/scheduler/

# Switch to non-root user
USER taro

CMD ["python", "-m", "scheduler.main"]
