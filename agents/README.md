# Taro Agents

This directory contains agent plugins for Taro.

## What is an Agent?

An agent is an independent, pluggable capability module for Taro. Think of agents as **applications** running on the Taro operating system.

Each agent:
- Has a **manifest** describing its name, capabilities, and configuration
- Implements an **execute()** method with its core logic
- Can optionally **react to events** from other agents or the system
- Is **discovered automatically** via Python entry points

## Creating an Agent

See the [Agent Development Guide](../docs/agent-development.md) for detailed instructions.

### Quick Example

```
agents/
└── my-agent/
    ├── pyproject.toml      # Package metadata + entry point
    ├── my_agent/
    │   ├── __init__.py
    │   └── agent.py        # Your agent class (extends BaseAgent)
    └── README.md
```

## Planned Agents

| Agent | Status | Description |
|---|---|---|
| System Health | ✅ Built-in | Monitors all service health |
| Daily Briefing | 🔜 Phase 2 | Generates personalized daily briefings |
| Web Research | 🔜 Phase 2 | Web search and summarization |
| GitHub Monitor | 🔜 Phase 2 | Repository and trend tracking |
| News Crawler | 🔜 Phase 2 | RSS feed aggregation |
| Learning Coach | 📋 Phase 3 | Learning plan management |
| Career Advisor | 📋 Phase 3 | Job opportunity monitoring |
| Knowledge Ingester | 📋 Phase 3 | Document import (PDF, Markdown, etc.) |
