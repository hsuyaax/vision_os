"""
Database Manager - SQLite operations for event logging
"""
import sqlite3
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)


class DatabaseManager:
    def __init__(self, db_path="events.db"):
        """Initialize database connection"""
        self.db_path = db_path
        self.conn = None
        self._init_db()
    
    def _init_db(self):
        """Create tables if they don't exist"""
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        
        cursor = self.conn.cursor()
        
        # Events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT UNIQUE NOT NULL,
                event_type TEXT NOT NULL,
                vertical TEXT NOT NULL,
                severity TEXT,
                message TEXT,
                confidence REAL,
                timestamp INTEGER NOT NULL,
                metadata TEXT,
                frame_snapshot BLOB
            )
        ''')
        
        # Analytics table for metrics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vertical TEXT NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                timestamp INTEGER NOT NULL
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_vertical ON events(vertical)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_analytics_vertical ON analytics(vertical)')
        
        self.conn.commit()
        logger.info(f"Database initialized: {self.db_path}")
    
    def insert_event(self, event_data: Dict) -> int:
        """
        Insert a new event
        
        Args:
            event_data: Dictionary containing event information
            
        Returns:
            Row ID of inserted event
        """
        cursor = self.conn.cursor()
        
        metadata_json = json.dumps(event_data.get('metadata', {}))
        
        cursor.execute('''
            INSERT INTO events (
                event_id, event_type, vertical, severity, message,
                confidence, timestamp, metadata, frame_snapshot
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_data.get('id'),
            event_data.get('type'),
            event_data.get('vertical'),
            event_data.get('severity'),
            event_data.get('message'),
            event_data.get('confidence'),
            event_data.get('timestamp', int(time.time())),
            metadata_json,
            event_data.get('frame_snapshot')
        ))
        
        self.conn.commit()
        return cursor.lastrowid
    
    def get_events(
        self,
        vertical: Optional[str] = None,
        severity: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Query events with filters
        
        Args:
            vertical: Filter by vertical (safety, traffic, etc.)
            severity: Filter by severity (HIGH, MEDIUM, LOW)
            start_time: Unix timestamp for start of range
            end_time: Unix timestamp for end of range
            limit: Maximum number of results
            
        Returns:
            List of event dictionaries
        """
        cursor = self.conn.cursor()
        
        query = "SELECT * FROM events WHERE 1=1"
        params = []
        
        if vertical:
            query += " AND vertical = ?"
            params.append(vertical)
        
        if severity:
            query += " AND severity = ?"
            params.append(severity)
        
        if start_time:
            query += " AND timestamp >= ?"
            params.append(start_time)
        
        if end_time:
            query += " AND timestamp <= ?"
            params.append(end_time)
        
        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        events = []
        for row in rows:
            event = dict(row)
            # Parse JSON metadata
            if event.get('metadata'):
                event['metadata'] = json.loads(event['metadata'])
            events.append(event)
        
        return events
    
    def insert_metric(self, vertical: str, metric_name: str, metric_value: float):
        """Insert analytics metric"""
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT INTO analytics (vertical, metric_name, metric_value, timestamp)
            VALUES (?, ?, ?, ?)
        ''', (vertical, metric_name, metric_value, int(time.time())))
        self.conn.commit()
    
    def get_metrics(
        self,
        vertical: str,
        metric_name: Optional[str] = None,
        hours: int = 24
    ) -> List[Dict]:
        """Get analytics metrics for the last N hours"""
        cursor = self.conn.cursor()
        
        start_time = int(time.time() - hours * 3600)
        
        query = "SELECT * FROM analytics WHERE vertical = ? AND timestamp >= ?"
        params = [vertical, start_time]
        
        if metric_name:
            query += " AND metric_name = ?"
            params.append(metric_name)
        
        query += " ORDER BY timestamp ASC"
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        return [dict(row) for row in rows]
    
    def cleanup_old_events(self, retention_days: int = 30):
        """Delete events older than retention period"""
        cutoff_time = int(time.time() - retention_days * 86400)
        cursor = self.conn.cursor()
        cursor.execute("DELETE FROM events WHERE timestamp < ?", (cutoff_time,))
        cursor.execute("DELETE FROM analytics WHERE timestamp < ?", (cutoff_time,))
        deleted = cursor.rowcount
        self.conn.commit()
        logger.info(f"Cleaned up {deleted} old records")
        return deleted
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        cursor = self.conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM events")
        total_events = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM analytics")
        total_metrics = cursor.fetchone()[0]
        
        cursor.execute("SELECT vertical, COUNT(*) as count FROM events GROUP BY vertical")
        events_by_vertical = {row['vertical']: row['count'] for row in cursor.fetchall()}
        
        return {
            "total_events": total_events,
            "total_metrics": total_metrics,
            "events_by_vertical": events_by_vertical
        }
    
    def close(self):
        """Close database connection"""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        self.close()


# Import time for timestamps
import time
