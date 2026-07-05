"""Main execution entry point for the Taro Agent Runtime microservice."""

from __future__ import annotations

import asyncio
import json
import signal
from typing import Any
import nats

from taro_common.config import TaroSettings
from taro_common.logging import setup_logging, get_logger
from taro_common.nats_client import TaroNatsClient
from taro_common.events import AgentExecuteRequest, AgentExecuteResult, Subjects

from agent_runtime.agent_loader import AgentLoader
from agent_runtime.context import AgentContext
from taro_api.services.ai_client import AIClient  # use API gateway client

logger = get_logger(__name__)
settings = TaroSettings()
nats_client = TaroNatsClient(url=settings.NATS_URL, service_name="agent-runtime")
ai_client = AIClient(base_url=settings.NODE1_AI_GATEWAY_URL)
shutdown_event = asyncio.Event()


async def handle_agent_execute(msg: nats.aio.msg.Msg) -> None:
    """Invoked when a NATS execution request matches."""
    try:
        payload_str = msg.data.decode("utf-8")
        event = AgentExecuteRequest.model_validate_json(payload_str)
    except Exception as e:
        logger.error("failed_to_parse_agent_execution_event", error=str(e))
        return

    agent_id = event.agent_id
    params = event.params or {}

    logger.info("received_agent_execution_request", agent_id=agent_id)
    
    loader = AgentLoader()
    agents = loader.discover_agents()
    
    # Simple match check
    agent = None
    for a in agents.values():
        if a.manifest.name == agent_id or agent_id in a.manifest.capabilities:
            agent = a
            break
            
    if not agent:
        logger.error("agent_or_capability_not_found", target=agent_id)
        return

    # Build context
    ctx = AgentContext(
        ai_client=ai_client,
        nats_client=nats_client,
        logger=logger,
        config=params,
    )

    try:
        res = await agent.execute(ctx)
        logger.info("agent_executed_successfully", name=agent.manifest.name, success=res.success)
        
        # Publish result back
        result_event = AgentExecuteResult(
            source="agent-runtime",
            agent_id=agent.manifest.name,
            task_id=event.task_id,
            status="completed" if res.success else "failed",
            result=res.data or {},
            error=res.message if not res.success else None,
        )
        await nats_client.publish_event(
            f"{Subjects.AGENT_EXECUTE_RESULT}.{agent.manifest.name}", result_event
        )
    except Exception as exc:
        logger.exception("agent_execution_failed", name=agent.manifest.name, error=str(exc))


async def main() -> None:
    """Connect to NATS bus, register subscribers, and run the main event loop."""
    setup_logging("agent-runtime", settings.LOG_LEVEL)
    logger.info("starting_agent_runtime")

    # Connect to NATS
    try:
        await nats_client.connect()
    except Exception as exc:
        logger.error("failed_to_connect_to_nats_aborting", error=str(exc))
        return

    # Subscribe to NATS executions
    # taro.agent.execute.request.*
    await nats_client.subscribe(f"{Subjects.AGENT_EXECUTE_REQUEST}.*", handle_agent_execute)
    logger.info("agent_runtime_subscribed_to_execution_events")

    # Graceful shutdown handlers
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown_event.set)
        except NotImplementedError:
            # Signal handlers not fully supported on some platforms (e.g. Windows)
            pass

    # Wait until shutdown
    await shutdown_event.wait()
    logger.info("shutting_down_agent_runtime")
    
    await nats_client.disconnect()
    await ai_client.close()
    logger.info("agent_runtime_stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
