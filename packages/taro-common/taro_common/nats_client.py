"""Async NATS connection manager for Taro services.

Handles connection lifecycle, auto-reconnect, publish/subscribe,
and JetStream stream management.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Callable, Coroutine

import nats
from nats.aio.client import Client as NATSClient
from nats.aio.subscription import Subscription
from nats.js.client import JetStreamContext

from taro_common.events import TaroEvent
from taro_common.logging import get_logger

logger = get_logger(__name__)


class TaroNatsClient:
    """Async NATS client with auto-reconnect and JetStream support.

    Usage::

        client = TaroNatsClient(url="nats://localhost:4222", service_name="ai-gateway")
        await client.connect()
        await client.publish_event("taro.chat.message", event)
        await client.disconnect()
    """

    def __init__(self, url: str = "nats://localhost:4222", service_name: str = "unknown") -> None:
        self._url = url
        self._service_name = service_name
        self._nc: NATSClient | None = None
        self._js: JetStreamContext | None = None
        self._subscriptions: list[Subscription] = []

    # ── Properties ─────────────────────────────────────────────────────

    @property
    def is_connected(self) -> bool:
        """Return ``True`` if the NATS connection is alive."""
        return self._nc is not None and self._nc.is_connected

    @property
    def jetstream(self) -> JetStreamContext:
        """Return the JetStream context, raising if not connected."""
        if self._js is None:
            raise RuntimeError("NATS JetStream not initialised — call connect() first")
        return self._js

    # ── Lifecycle ──────────────────────────────────────────────────────

    async def connect(self) -> None:
        """Establish connection to the NATS server with reconnect logic."""
        try:
            self._nc = await nats.connect(
                servers=[self._url],
                name=self._service_name,
                reconnect_time_wait=2,
                max_reconnect_attempts=-1,  # unlimited
                error_cb=self._on_error,
                disconnected_cb=self._on_disconnected,
                reconnected_cb=self._on_reconnected,
                closed_cb=self._on_closed,
            )
            self._js = self._nc.jetstream()
            logger.info("nats_connected", url=self._url, service=self._service_name)
        except Exception:
            logger.exception("nats_connect_failed", url=self._url)
            raise

    async def disconnect(self) -> None:
        """Gracefully drain subscriptions and close the connection."""
        if self._nc is None:
            return
        try:
            for sub in self._subscriptions:
                try:
                    await sub.unsubscribe()
                except Exception:
                    pass
            self._subscriptions.clear()
            await self._nc.drain()
            logger.info("nats_disconnected", service=self._service_name)
        except Exception:
            logger.exception("nats_disconnect_error")

    # ── Publish / Subscribe ────────────────────────────────────────────

    async def publish_event(self, subject: str, event: TaroEvent) -> None:
        """Serialize and publish a :class:`TaroEvent` to a NATS subject.

        Args:
            subject: NATS subject string (e.g. ``taro.chat.message.received``).
            event: Event instance to serialize as JSON.
        """
        if self._nc is None or not self._nc.is_connected:
            logger.warning("nats_publish_skipped_not_connected", subject=subject)
            return
        data = event.model_dump_json().encode()
        await self._nc.publish(subject, data)
        logger.debug("nats_event_published", subject=subject, event_type=event.event_type)

    async def publish_raw(self, subject: str, data: dict[str, Any]) -> None:
        """Publish a raw dictionary as JSON to a NATS subject."""
        if self._nc is None or not self._nc.is_connected:
            logger.warning("nats_publish_raw_skipped_not_connected", subject=subject)
            return
        payload = json.dumps(data).encode()
        await self._nc.publish(subject, payload)

    async def subscribe(
        self,
        subject: str,
        callback: Callable[..., Coroutine[Any, Any, None]],
        queue: str = "",
    ) -> Subscription:
        """Subscribe to a NATS subject with an async callback.

        Args:
            subject: NATS subject pattern (wildcards allowed).
            callback: Async function receiving a NATS message.
            queue: Optional queue group for load balancing.

        Returns:
            The NATS :class:`Subscription` handle.
        """
        if self._nc is None:
            raise RuntimeError("NATS not connected — call connect() first")
        sub = await self._nc.subscribe(subject, queue=queue, cb=callback)
        self._subscriptions.append(sub)
        logger.info("nats_subscribed", subject=subject, queue=queue or "(none)")
        return sub

    # ── JetStream helpers ──────────────────────────────────────────────

    async def ensure_stream(
        self,
        name: str,
        subjects: list[str],
        max_age: int = 86_400,
        max_bytes: int = -1,
    ) -> None:
        """Create or update a JetStream stream.

        Args:
            name: Stream name.
            subjects: List of subjects the stream captures.
            max_age: Maximum message age in seconds (default 24 h).
            max_bytes: Maximum stream size in bytes (-1 = unlimited).
        """
        js = self.jetstream
        try:
            await js.find_stream_name_by_subject(subjects[0])
            logger.debug("jetstream_stream_exists", stream=name)
        except Exception:
            await js.add_stream(
                name=name,
                subjects=subjects,
                max_age=max_age,
                max_bytes=max_bytes,
            )
            logger.info("jetstream_stream_created", stream=name, subjects=subjects)

    async def js_publish(self, subject: str, event: TaroEvent) -> None:
        """Publish an event via JetStream for guaranteed delivery."""
        js = self.jetstream
        data = event.model_dump_json().encode()
        ack = await js.publish(subject, data)
        logger.debug("jetstream_published", subject=subject, seq=ack.seq)

    # ── Internal callbacks ─────────────────────────────────────────────

    async def _on_error(self, e: Exception) -> None:
        logger.error("nats_error", error=str(e))

    async def _on_disconnected(self) -> None:
        logger.warning("nats_disconnected_event", service=self._service_name)

    async def _on_reconnected(self) -> None:
        logger.info("nats_reconnected", service=self._service_name)

    async def _on_closed(self) -> None:
        logger.info("nats_connection_closed", service=self._service_name)
