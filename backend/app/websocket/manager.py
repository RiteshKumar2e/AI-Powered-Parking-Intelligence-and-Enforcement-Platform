"""
WebSocket connection manager for real-time violation and congestion push.
"""
import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Map of channel -> set of active WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "global"):
        await websocket.accept()
        if channel not in self._connections:
            self._connections[channel] = set()
        self._connections[channel].add(websocket)
        logger.info(f"WS connected: channel={channel}, total={len(self._connections[channel])}")

    def disconnect(self, websocket: WebSocket, channel: str = "global"):
        if channel in self._connections:
            self._connections[channel].discard(websocket)

    async def broadcast(self, event_type: str, data: Any, channel: str = "global"):
        """Send a JSON message to all clients subscribed to a channel."""
        if channel not in self._connections or not self._connections[channel]:
            return
        message = json.dumps({"type": event_type, "data": data})
        dead = set()
        for ws in list(self._connections[channel]):
            try:
                await ws.send_text(message)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections[channel].discard(ws)

    async def broadcast_violation(self, violation_data: dict):
        await self.broadcast("new_violation", violation_data, channel="violations")
        await self.broadcast("new_violation", violation_data, channel="global")

    async def broadcast_congestion(self, congestion_data: dict):
        await self.broadcast("congestion_update", congestion_data, channel="congestion")
        await self.broadcast("congestion_update", congestion_data, channel="global")

    def connection_count(self, channel: str = "global") -> int:
        return len(self._connections.get(channel, set()))


manager = ConnectionManager()
