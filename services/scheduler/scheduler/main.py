"""Main entry point for the Taro Task Scheduler service.

Uses APScheduler to trigger events over NATS on periodic intervals.
"""

from __future__ import annotations

import asyncio
import signal
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from taro_common.config import TaroSettings
from taro_common.logging import setup_logging, get_logger
from taro_common.nats_client import TaroNatsClient

logger = get_logger(__name__)
settings = TaroSettings()
nats_client = TaroNatsClient(url=settings.NATS_URL, service_name="scheduler")
scheduler = AsyncIOScheduler()
shutdown_event = asyncio.Event()


async def trigger_briefing_job() -> None:
    """Scheduled task to publish a Daily Briefing regeneration event."""
    logger.info("triggering_scheduled_daily_briefing_job")
    if nats_client and nats_client.is_connected:
        from taro_common.events import TaskTriggered, Subjects
        event = TaskTriggered(
            source="scheduler",
            task_id="daily-briefing-regeneration",
            payload={"triggered_at": datetime.utcnow().isoformat()},
        )
        try:
            await nats_client.publish_event(
                Subjects.TASK_TRIGGERED, event
            )
            logger.info("published_task_trigger_event_to_nats", task_id="daily-briefing")
        except Exception as exc:
            logger.error("failed_to_publish_task_trigger", error=str(exc))


async def main() -> None:
    """Connect to NATS bus, register schedules, and run scheduler loop."""
    setup_logging("scheduler", settings.LOG_LEVEL)
    logger.info("starting_scheduler")

    # Connect to NATS
    try:
        await nats_client.connect()
    except Exception as exc:
        logger.error("nats_connection_failed_aborting", error=str(exc))
        return

    # Add schedule: trigger briefing generation every 6 hours
    # For testing, we also trigger it once on startup (after 5 seconds delay)
    scheduler.add_job(trigger_briefing_job, "interval", hours=6, id="daily_briefing_6h")
    
    # Start scheduler
    scheduler.start()
    logger.info("apscheduler_started")

    # Graceful shutdown signals
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown_event.set)
        except NotImplementedError:
            pass

    # Wait for shutdown
    await shutdown_event.wait()
    logger.info("stopping_scheduler")
    
    scheduler.shutdown()
    await nats_client.disconnect()
    logger.info("scheduler_stopped")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
