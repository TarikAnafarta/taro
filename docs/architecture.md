# Taro Architecture

## Overview

Taro is a distributed personal AI operating system running across two LAN-connected nodes. It uses an event-driven microservices architecture with a plugin-based agent system.

## System Design Principles

1. **Product First**: Taro is a personal AI assistant, not an infrastructure dashboard. Every architectural decision serves the end-user experience.
2. **Agent-as-Application**: Every capability is an independent agent. Agents are loosely coupled and communicate through NATS events.
3. **Distributed by Design**: Services run across multiple nodes, communicating over LAN HTTP and NATS messaging.
4. **Resilient**: If one service crashes, the rest continue operating. Each service has health checks and auto-restart.
5. **Extensible**: New agents and services can be added without modifying the core system.
6. **Observable**: Structured logging, health endpoints, and monitoring on every service.

## Node Layout

### Node 1 — AI Compute

Handles all computationally expensive AI operations:

| Service | Port | Purpose |
|---|---|---|
| Ollama | 11434 | LLM inference (qwen2.5:7b default) |
| Qdrant | 6333/6334 | Vector database for semantic memory |
| AI Gateway | 8100 | Unified FastAPI proxy for all AI services |

### Node 2 — Core Services

Handles application logic, data, and user-facing services:

| Service | Port | Purpose |
|---|---|---|
| Taro API | 8000 | Core backend API (FastAPI) |
| Dashboard | 3000 | Web UI (Next.js) |
| PostgreSQL | 5432 | Primary relational database |
| Redis | 6379 | Cache and real-time pub/sub |
| NATS | 4222 | Message bus with JetStream |
| MinIO | 9000 | S3-compatible file storage |
| Beszel | 8090 | System monitoring |
| Uptime Kuma | 3001 | Service health monitoring |

## Communication Patterns

### Synchronous (HTTP)

- **Dashboard → Taro API**: REST API calls over HTTP
- **Taro API → AI Gateway**: REST API calls over LAN HTTP
- **Health checks**: Each service exposes `/health` endpoint

### Asynchronous (NATS)

Used for event-driven operations, agent communication, and scheduled tasks:

```
taro.
├── chat.message.received       # New user message
├── chat.message.response       # AI response generated
├── agent.
│   ├── execute.{agent_id}      # Trigger agent execution
│   ├── result.{agent_id}       # Agent execution result
│   └── status.{agent_id}       # Agent status change
├── task.
│   ├── trigger                 # Scheduled task fired
│   └── completed               # Task completed
├── memory.
│   ├── stored                  # New memory stored
│   └── searched                # Memory search performed
└── system.
    ├── health                  # Health check events
    └── node.{node_id}.status   # Node status updates
```

## Agent Architecture

```
┌─────────────────────────────────────────────────┐
│                  Agent Runtime                    │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │              Agent Loader                     │ │
│  │  - Discovers agents via entry points          │ │
│  │  - Validates manifests                        │ │
│  │  - Hot-reload in development                  │ │
│  └──────────────┬──────────────────────────────┘ │
│                 │                                  │
│  ┌──────────────▼──────────────────────────────┐ │
│  │           Agent Registry                      │ │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐    │ │
│  │  │Agent1│  │Agent2│  │Agent3│  │ ...  │    │ │
│  │  └──────┘  └──────┘  └──────┘  └──────┘    │ │
│  └──────────────┬──────────────────────────────┘ │
│                 │                                  │
│  ┌──────────────▼──────────────────────────────┐ │
│  │           Agent Context                       │ │
│  │  - AI client (chat, embeddings, memory)       │ │
│  │  - NATS client (events)                       │ │
│  │  - Logger                                     │ │
│  │  - Config                                     │ │
│  └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Creating an Agent

```python
from agent_runtime.base_agent import BaseAgent, AgentContext, AgentResult
from taro_common.models import AgentManifest

class MyAgent(BaseAgent):
    @property
    def manifest(self) -> AgentManifest:
        return AgentManifest(
            name="my-agent",
            description="Does something useful",
            version="0.1.0",
            capabilities=["research", "summarize"],
        )
    
    async def execute(self, context: AgentContext) -> AgentResult:
        # Use context.ai for LLM calls
        # Use context.events for NATS messaging
        # Use context.logger for structured logging
        result = await context.ai.chat_completion(
            messages=[{"role": "user", "content": "Hello!"}]
        )
        return AgentResult(success=True, data={"response": result})
```

## Data Flow

### Chat Flow

1. User sends message via Dashboard
2. Dashboard calls `POST /api/chat` on Taro API
3. Taro API stores message in PostgreSQL
4. Taro API forwards to AI Gateway `POST /v1/chat/completions`
5. AI Gateway queries Qdrant for relevant memories
6. AI Gateway sends prompt + context to Ollama
7. Ollama generates response (streamed)
8. Response flows back: AI Gateway → Taro API → Dashboard
9. Taro API stores response in PostgreSQL
10. Taro API publishes `taro.chat.message.response` to NATS

### Daily Briefing Flow (Future)

1. Scheduler fires `taro.task.trigger` event
2. Agent Runtime dispatches to Briefing Agent
3. Briefing Agent gathers data from various sources (RSS, APIs, etc.)
4. Briefing Agent uses AI Gateway to summarize and rank items
5. Results stored in PostgreSQL `briefing_items` table
6. Dashboard displays briefing cards

## Security Model

### Phase 1 (Current)
- **Authentication**: Local username/password with bcrypt hashing
- **Authorization**: JWT tokens (1-hour expiry) in Authorization Bearer header
- **Network**: LAN-only, no public exposure
- **Inter-service**: Internal Docker network, no auth between services

### Future Phases
- Tailscale mesh for encrypted inter-node communication
- JWT for inter-service authentication
- RBAC for multi-user support
- API key system for external integrations

## Technology Rationale

| Choice | Why |
|---|---|
| **NATS** over RabbitMQ | 20MB footprint vs 200MB+, built-in JetStream, request-reply pattern |
| **Qdrant** over ChromaDB | Rust-based performance, advanced filtering, production-grade |
| **FastAPI** over Flask | Async native, auto-docs, Pydantic validation, WebSocket support |
| **Beszel** over Prometheus | ~10MB agent, Docker-aware, zero configuration required |
| **PostgreSQL** over MongoDB | Relational integrity for user data, JSONB for flexible fields, full-text search |
