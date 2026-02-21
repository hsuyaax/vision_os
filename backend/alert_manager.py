"""
Alert Manager - Handles alert triggering, deduplication, and broadcasting
"""
import time
import logging
import asyncio
from typing import Dict, List, Callable, Optional
from collections import defaultdict

logger = logging.getLogger(__name__)


class AlertManager:
    def __init__(self, db_manager=None):
        """
        Initialize alert manager
        
        Args:
            db_manager: DatabaseManager instance for persisting alerts
        """
        self.db = db_manager
        self.last_alert_time = defaultdict(float)  # key: (vertical, alert_type) -> timestamp
        self.subscribers = []  # List of async callbacks for broadcasting
        self.alert_counter = 0
        
    def trigger(
        self,
        vertical: str,
        alert_type: str,
        severity: str,
        message: str,
        confidence: float = 1.0,
        cooldown: int = 15,
        metadata: Optional[Dict] = None,
        frame_snapshot: Optional[bytes] = None
    ) -> Optional[Dict]:
        """
        Trigger an alert with cooldown logic
        
        Args:
            vertical: Vertical name (safety, traffic, etc.)
            alert_type: Type of alert (PPE_VIOLATION, DEFECT_DETECTED, etc.)
            severity: HIGH, MEDIUM, or LOW
            message: Human-readable alert message
            confidence: Confidence score (0-1)
            cooldown: Minimum seconds between same alert type
            metadata: Additional data to store
            frame_snapshot: Image bytes (optional)
            
        Returns:
            Alert dictionary if triggered, None if in cooldown
        """
        alert_key = (vertical, alert_type)
        current_time = time.time()
        last_time = self.last_alert_time.get(alert_key, 0)
        
        # Check cooldown
        if current_time - last_time < cooldown:
            logger.debug(f"Alert {alert_type} in cooldown, skipping")
            return None
        
        # Update last alert time
        self.last_alert_time[alert_key] = current_time
        
        # Create alert object
        self.alert_counter += 1
        alert = {
            "id": f"alert_{self.alert_counter:05d}",
            "type": alert_type,
            "severity": severity,
            "message": message,
            "confidence": confidence,
            "vertical": vertical,
            "timestamp": int(current_time),
            "metadata": metadata or {},
            "frame_snapshot": frame_snapshot
        }
        
        logger.info(f"Alert triggered: {alert_type} ({severity}) - {message}")
        
        # Persist to database
        if self.db:
            try:
                self._persist(alert)
            except Exception as e:
                logger.error(f"Failed to persist alert: {e}")
        
        # Broadcast to subscribers
        asyncio.create_task(self._broadcast(alert))
        
        return alert
    
    def _persist(self, alert: Dict):
        """Save alert to database"""
        self.db.insert_event(alert)
    
    async def _broadcast(self, alert: Dict):
        """Send alert to all subscribers (WebSocket clients)"""
        if not self.subscribers:
            return
        
        # Create a copy without frame_snapshot for broadcasting (too large)
        broadcast_alert = {k: v for k, v in alert.items() if k != 'frame_snapshot'}
        
        # Convert bytes to base64 if needed for transmission
        if alert.get('frame_snapshot'):
            import base64
            broadcast_alert['frame_snapshot_preview'] = base64.b64encode(
                alert['frame_snapshot'][:1000]  # Send small preview only
            ).decode('utf-8')
        
        # Call all subscriber callbacks
        dead_subscribers = []
        for subscriber in self.subscribers:
            try:
                await subscriber(broadcast_alert)
            except Exception as e:
                logger.error(f"Failed to broadcast to subscriber: {e}")
                dead_subscribers.append(subscriber)
        
        # Remove dead subscribers
        for sub in dead_subscribers:
            self.subscribers.remove(sub)
    
    def subscribe(self, callback: Callable):
        """
        Subscribe to alerts
        
        Args:
            callback: Async function that receives alert dict
        """
        self.subscribers.append(callback)
        logger.info(f"New alert subscriber added, total: {len(self.subscribers)}")
    
    def unsubscribe(self, callback: Callable):
        """Unsubscribe from alerts"""
        if callback in self.subscribers:
            self.subscribers.remove(callback)
            logger.info(f"Subscriber removed, remaining: {len(self.subscribers)}")
    
    def get_recent_alerts(self, vertical: Optional[str] = None, limit: int = 50) -> List[Dict]:
        """
        Get recent alerts from database
        
        Args:
            vertical: Filter by vertical (optional)
            limit: Maximum number of alerts to return
            
        Returns:
            List of alert dictionaries
        """
        if not self.db:
            return []
        
        return self.db.get_events(vertical=vertical, limit=limit)
    
    def get_stats(self) -> Dict:
        """Get alert statistics"""
        return {
            "total_subscribers": len(self.subscribers),
            "total_alerts_triggered": self.alert_counter,
            "active_cooldowns": len(self.last_alert_time)
        }
    
    def reset_cooldown(self, vertical: str, alert_type: str):
        """Manually reset cooldown for a specific alert type"""
        alert_key = (vertical, alert_type)
        if alert_key in self.last_alert_time:
            del self.last_alert_time[alert_key]
            logger.info(f"Cooldown reset for {alert_type}")
    
    def clear_all_cooldowns(self):
        """Clear all cooldowns (useful for testing)"""
        self.last_alert_time.clear()
        logger.info("All cooldowns cleared")
