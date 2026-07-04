<div align="center">

# 🌿 Taro

### Personal AI Operating System

*Your second brain. Your AI chief of staff.*

</div>

---

## What is Taro?

Taro is a **distributed personal AI operating system** that continuously learns about you, remembers your preferences, monitors the internet, analyzes information, and proactively helps you become more productive.

It runs across **two dedicated LAN-connected computers** as a set of containerized microservices, with a plugin-based agent architecture that allows new capabilities to be added without modifying the core system.

## Architecture

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│     Node 1 — AI Compute        │    │     Node 2 — Core Services      │
│                                 │    │                                 │
│  ┌───────────┐  ┌───────────┐  │    │  ┌───────────┐  ┌───────────┐  │
│  │  Ollama   │  │  Qdrant   │  │    │  │ Taro API  │  │ Dashboard │  │
│  │ (LLM)     │  │ (Vectors) │  │    │  │ (FastAPI) │  │ (Next.js) │  │
│  └─────┬─────┘  └─────┬─────┘  │    │  └─────┬─────┘  └───────────┘  │
│        │              │         │    │        │                        │
│  ┌─────┴──────────────┴─────┐  │    │  ┌─────┴─────┐  ┌───────────┐  │
│  │    AI Gateway (:8100)    │◄─┼────┼──┤   NATS    │  │  Redis    │  │
│  └──────────────────────────┘  │    │  └───────────┘  └───────────┘  │
│                                 │    │  ┌───────────┐  ┌───────────┐  │
│                                 │    │  │PostgreSQL │  │   MinIO   │  │
│                                 │    │  └───────────┘  └───────────┘  │
└─────────────────────────────────┘    └─────────────────────────────────┘
              LAN / HTTP                         LAN / HTTP
```

## Quick Start

### Prerequisites

- Docker & Docker Compose v2
- Git
- 2 machines on the same LAN (or one machine for development)

### 1. Clone and Configure

```bash
git clone <your-repo-url> Taro
cd Taro

# Copy environment templates
cp docker/node1-ai-compute/.env.example docker/node1-ai-compute/.env
cp docker/node2-core-services/.env.example docker/node2-core-services/.env

# Edit .env files with your LAN IPs
# See docs/setup-guide.md for how to find your IP addresses
```

### 2. Start Node 2 (Core Services)

```bash
cd docker/node2-core-services
docker compose up -d
```

### 3. Start Node 1 (AI Compute)

On your second machine:

```bash
cd docker/node1-ai-compute
docker compose up -d

# Pull default models
docker compose exec ollama ollama pull qwen2.5:7b
docker compose exec ollama ollama pull nomic-embed-text
```

### 4. Open Taro

Navigate to `http://<NODE2_IP>:3000` in your browser.

On first launch, you'll be guided through the **onboarding wizard** to set up your profile, interests, and preferences.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2 |
| Frontend | TypeScript, Next.js 15, React 19 |
| LLM Inference | Ollama (qwen2.5:7b default) |
| Vector DB | Qdrant |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message Bus | NATS + JetStream |
| File Storage | MinIO |
| Monitoring | Beszel + Uptime Kuma |
| Auth | Local user/password + JWT |
| Containerization | Docker Compose |

## Project Structure

```
Taro/
├── packages/taro-common/       # Shared Python library
├── services/
│   ├── ai-gateway/             # AI inference proxy (Node 1)
│   ├── taro-api/               # Core backend API (Node 2)
│   ├── agent-runtime/          # Agent execution engine
│   ├── scheduler/              # Task scheduler
│   └── dashboard/              # Next.js web UI
├── agents/                     # Agent plugins (future)
├── docker/
│   ├── node1-ai-compute/       # Docker Compose for Node 1
│   └── node2-core-services/    # Docker Compose for Node 2
├── scripts/                    # Utility scripts
└── docs/                       # Documentation
```

## Development

### Single-Machine Development

For development, you can run everything on one machine. Set both `NODE1_HOST` and `NODE2_HOST` to `localhost` or `127.0.0.1` in your `.env` files.

### Running Services Locally (without Docker)

```bash
# Backend services
cd services/taro-api
pip install -e ".[dev]"
uvicorn taro_api.main:app --reload --port 8000

# Dashboard
cd services/dashboard
npm install
npm run dev
```

## Security Notice

> ⚠️ **LAN-Only**: Taro is designed for local network use only. Do not expose services to the public internet without adding TLS/HTTPS (see Tailscale upgrade path in docs).

## License

Private project. All rights reserved.

## Documentation

- [Setup Guide](docs/setup-guide.md) — First-time setup with IP discovery instructions
- [Architecture](docs/architecture.md) — Detailed architecture documentation
- [Agent Development](docs/agent-development.md) — How to create agent plugins
