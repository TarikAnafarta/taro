# ── Stage 1: Build dependencies ─────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools
RUN pip install --no-cache-dir uv

# Copy dependency manifests first for layer caching
COPY packages/taro-common/pyproject.toml packages/taro-common/pyproject.toml
COPY packages/taro-common/taro_common/ packages/taro-common/taro_common/
COPY services/agent-runtime/pyproject.toml services/agent-runtime/pyproject.toml

# Install dependencies
RUN cd services/agent-runtime && uv pip install --system --no-cache -e ../../packages/taro-common -e .

# ── Stage 2: Production image ──────────────────────────────────────────
FROM python:3.12-slim AS runtime

LABEL maintainer="taro" \
      service="agent-runtime"

# Create non-root user
RUN groupadd -r taro && useradd -r -g taro -d /app -s /sbin/nologin taro

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY packages/taro-common/taro_common/ /app/taro_common/
COPY services/agent-runtime/agent_runtime/ /app/agent_runtime/

# Switch to non-root user
USER taro

CMD ["python", "-m", "agent_runtime.main"]
