# Agent Development Guide

## Overview

Taro uses a plugin-based agent architecture. Every capability is an independent agent that can be added without modifying the core system.

Think of agents as **applications** running on the Taro operating system.

## Agent Anatomy

Every agent is a Python package that:

1. **Extends `BaseAgent`** — the abstract base class defining the agent interface
2. **Defines a manifest** — metadata describing what the agent does
3. **Implements `execute()`** — the main logic that runs when the agent is triggered
4. **Optionally handles events** — reacts to system events via NATS

## Quick Start

### 1. Create the Agent Package

```
agents/
└── my-agent/
    ├── pyproject.toml
    ├── my_agent/
    │   ├── __init__.py
    │   └── agent.py
    └── README.md
```

### 2. Define pyproject.toml

```toml
[project]
name = "taro-agent-my-agent"
version = "0.1.0"
description = "My custom Taro agent"
requires-python = ">=3.12"
dependencies = [
    "taro-common",
]

[project.entry-points."taro.agents"]
my-agent = "my_agent.agent:MyAgent"
```

The `[project.entry-points."taro.agents"]` section is how the Agent Runtime discovers your agent.

### 3. Implement the Agent

```python
"""My custom Taro agent."""

from agent_runtime.base_agent import BaseAgent, AgentResult
from agent_runtime.context import AgentContext
from taro_common.models import AgentManifest


class MyAgent(BaseAgent):
    """Example agent that demonstrates the agent interface."""

    @property
    def manifest(self) -> AgentManifest:
        return AgentManifest(
            name="my-agent",
            description="Performs a custom task",
            version="0.1.0",
            capabilities=["custom-task"],
            config={
                "setting_1": "default_value",
            },
        )

    async def execute(self, context: AgentContext) -> AgentResult:
        """Main execution logic.
        
        This is called when:
        - The agent is triggered via API
        - A scheduled task fires for this agent
        - Another agent requests this agent's capability
        """
        context.logger.info("Starting execution", agent=self.manifest.name)
        
        # Use AI for inference
        response = await context.ai.chat_completion(
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Summarize recent AI news."},
            ]
        )
        
        # Publish results via NATS
        await context.events.publish_event(
            "taro.agent.result.my-agent",
            {"summary": response}
        )
        
        return AgentResult(
            success=True,
            data={"summary": response},
            message="Task completed successfully",
        )

    async def on_event(self, event):
        """Optional: React to system events.
        
        Override this to handle specific NATS events.
        For example, react when a new memory is stored
        or when a chat message is received.
        """
        pass
```

### 4. Install and Register

```bash
# Install the agent package
cd agents/my-agent
pip install -e .

# The Agent Runtime will discover it via entry points on next startup
```

## Agent Context

The `AgentContext` provides everything an agent needs:

| Property | Type | Description |
|---|---|---|
| `ai` | `AIClient` | AI Gateway client for chat, embeddings, memory |
| `events` | `TaroNatsClient` | NATS client for publishing/subscribing to events |
| `logger` | `BoundLogger` | Structured logger with agent context |
| `config` | `dict` | Agent-specific configuration from database |

### AI Client Methods

```python
# Chat completion
response = await context.ai.chat_completion(
    messages=[{"role": "user", "content": "Hello!"}],
    model="qwen2.5:7b",  # optional, uses default if omitted
    stream=False,
)

# Generate embeddings
embedding = await context.ai.generate_embedding("Some text to embed")

# Check AI Gateway health
health = await context.ai.health_check()
```

### Event Publishing

```python
# Publish an event
await context.events.publish_event(
    subject="taro.agent.result.my-agent",
    event=AgentExecuteResult(
        agent_id="my-agent",
        success=True,
        data={"key": "value"},
    )
)
```

## Agent Manifest

The manifest describes your agent's metadata:

```python
AgentManifest(
    name="my-agent",           # Unique identifier
    description="What it does", # Human-readable description
    version="0.1.0",           # Semantic version
    capabilities=[              # List of capabilities
        "research",
        "summarize",
        "notify",
    ],
    config={                    # Default configuration
        "max_items": 10,
        "language": "en",
    },
)
```

## Built-in Agent Examples

### System Health Agent

Monitors all services and reports status:

```python
class SystemAgent(BaseAgent):
    @property
    def manifest(self):
        return AgentManifest(
            name="system-health",
            description="Monitors system health across all nodes",
            version="0.1.0",
            capabilities=["health-check", "monitoring"],
        )
    
    async def execute(self, context):
        health = await context.ai.health_check()
        # ... check other services
        return AgentResult(success=True, data=health)
```

## Future Agent Ideas

| Agent | Description |
|---|---|
| **Daily Briefing** | Generates personalized daily briefings from news, GitHub, etc. |
| **Web Research** | Searches the web and summarizes findings |
| **GitHub Monitor** | Tracks repositories, issues, PRs, trending repos |
| **Learning Coach** | Creates learning plans and tracks progress |
| **Career Advisor** | Monitors job listings matching your goals |
| **Fitness Tracker** | Generates workout reminders and nutrition tips |
| **News Crawler** | Fetches and summarizes news from RSS feeds |
| **Knowledge Ingester** | Imports PDFs, markdown, bookmarks into memory |
| **Code Reviewer** | Reviews code and suggests improvements |
| **Security Monitor** | Tracks cybersecurity news and vulnerabilities |

## Testing Agents

```python
import pytest
from unittest.mock import AsyncMock
from my_agent.agent import MyAgent
from agent_runtime.context import AgentContext

@pytest.mark.asyncio
async def test_my_agent():
    agent = MyAgent()
    context = AgentContext(
        ai=AsyncMock(),
        events=AsyncMock(),
        logger=AsyncMock(),
        config={},
    )
    context.ai.chat_completion.return_value = "Test response"
    
    result = await agent.execute(context)
    
    assert result.success is True
    assert "summary" in result.data
```
