"""
Restaurant Vertical Logic - Occupancy monitoring, dwell time tracking, table management
"""
import logging
from typing import Dict, List, Optional
import time
from collections import defaultdict

logger = logging.getLogger(__name__)


class RestaurantProcessor:
    def __init__(self, config: Dict, alert_manager):
        """
        Initialize restaurant processor
        
        Args:
            config: Restaurant vertical configuration
            alert_manager: AlertManager instance for triggering alerts
        """
        self.config = config
        self.alert_manager = alert_manager
        self.classes_of_interest = config.get('classes_of_interest', ['person', 'chair', 'dining table'])
        self.max_capacity = config.get('max_capacity', 50)
        self.dwell_time_threshold = config.get('dwell_time_threshold', 1800)  # 30 minutes in seconds
        self.alert_cooldown = config.get('alert_cooldown', 30)
        
        # Tracking
        self.person_tracks = {}  # person_id -> first_seen_time
        self.table_states = {}  # table_id -> {occupied, person_count, entry_time}
        self.next_person_id = 0
        self.next_table_id = 0
        
        # Metrics
        self.metrics = {
            "people_count": 0,
            "tables_total": 0,
            "tables_occupied": 0,
            "tables_available": 0,
            "occupancy_rate": 0.0,
            "avg_dwell_time": 0,
            "long_stays": 0
        }
    
    def process(self, inference_result: Dict) -> Dict:
        """
        Process restaurant-related detections
        
        Args:
            inference_result: Result from inference engine
            
        Returns:
            Updated metrics
        """
        detections = inference_result.get('detections', [])
        current_time = inference_result.get('timestamp', time.time())
        
        # Separate people, tables, and chairs
        people = []
        tables = []
        chairs = []
        
        for det in detections:
            class_name = det.get('class', '').lower()
            
            if 'person' in class_name:
                people.append(det)
            elif 'table' in class_name or 'dining' in class_name:
                tables.append(det)
            elif 'chair' in class_name:
                chairs.append(det)
        
        # Update metrics
        self.metrics["people_count"] = len(people)
        self.metrics["tables_total"] = max(len(tables), self.metrics.get("tables_total", 0))
        
        # Track people for dwell time
        self._track_people(people, current_time)
        
        # Detect table occupancy
        self._analyze_tables(tables, people, chairs, current_time)
        
        # Check capacity
        self._check_capacity(len(people))
        
        # Check long stays
        self._check_long_stays(current_time)
        
        # Calculate occupancy rate
        if self.metrics["tables_total"] > 0:
            self.metrics["occupancy_rate"] = round(
                (self.metrics["tables_occupied"] / self.metrics["tables_total"]) * 100, 1
            )
        
        return self.metrics.copy()
    
    def _track_people(self, people: List[Dict], current_time: float):
        """Track people for dwell time calculation"""
        current_positions = {}
        
        for person in people:
            bbox = person['bbox']
            center_x = (bbox['x1'] + bbox['x2']) / 2
            center_y = (bbox['y1'] + bbox['y2']) / 2
            
            # Find closest existing track
            min_distance = float('inf')
            closest_id = None
            
            for pid, track_data in self.person_tracks.items():
                if 'last_position' in track_data:
                    last_x, last_y = track_data['last_position']
                    distance = ((center_x - last_x)**2 + (center_y - last_y)**2)**0.5
                    
                    if distance < min_distance and distance < 100:  # Threshold
                        min_distance = distance
                        closest_id = pid
            
            # Create new track or update existing
            if closest_id is not None:
                person_id = closest_id
            else:
                person_id = self.next_person_id
                self.next_person_id += 1
                self.person_tracks[person_id] = {
                    'first_seen': current_time,
                    'last_seen': current_time,
                    'last_position': (center_x, center_y)
                }
            
            # Update track
            self.person_tracks[person_id]['last_seen'] = current_time
            self.person_tracks[person_id]['last_position'] = (center_x, center_y)
            current_positions[person_id] = True
        
        # Remove old tracks (not seen for 5 seconds)
        ids_to_remove = []
        for pid, track_data in self.person_tracks.items():
            if pid not in current_positions and (current_time - track_data['last_seen']) > 5:
                ids_to_remove.append(pid)
        
        for pid in ids_to_remove:
            del self.person_tracks[pid]
        
        # Calculate average dwell time
        if self.person_tracks:
            total_dwell = sum([current_time - track['first_seen'] 
                              for track in self.person_tracks.values()])
            self.metrics["avg_dwell_time"] = int(total_dwell / len(self.person_tracks))
    
    def _analyze_tables(self, tables: List[Dict], people: List[Dict], chairs: List[Dict], current_time: float):
        """Analyze table occupancy"""
        self.metrics["tables_occupied"] = 0
        self.metrics["tables_available"] = 0
        
        for table in tables:
            table_bbox = table['bbox']
            
            # Count people near this table
            people_at_table = 0
            for person in people:
                person_bbox = person['bbox']
                
                # Check if person is near table
                if self._is_near(person_bbox, table_bbox, threshold=100):
                    people_at_table += 1
            
            # Table is occupied if there are people nearby
            if people_at_table > 0:
                self.metrics["tables_occupied"] += 1
            else:
                self.metrics["tables_available"] += 1
    
    def _is_near(self, bbox1: Dict, bbox2: Dict, threshold: float = 100) -> bool:
        """Check if two bounding boxes are near each other"""
        center1_x = (bbox1['x1'] + bbox1['x2']) / 2
        center1_y = (bbox1['y1'] + bbox1['y2']) / 2
        center2_x = (bbox2['x1'] + bbox2['x2']) / 2
        center2_y = (bbox2['y1'] + bbox2['y2']) / 2
        
        distance = ((center1_x - center2_x)**2 + (center1_y - center2_y)**2)**0.5
        return distance < threshold
    
    def _check_capacity(self, people_count: int):
        """Check if occupancy exceeds capacity"""
        if people_count > self.max_capacity:
            self.alert_manager.trigger(
                vertical="restaurant",
                alert_type="CAPACITY_EXCEEDED",
                severity="HIGH",
                message=f"Restaurant capacity exceeded: {people_count}/{self.max_capacity}",
                confidence=0.9,
                cooldown=self.alert_cooldown,
                metadata={
                    "current_count": people_count,
                    "max_capacity": self.max_capacity,
                    "excess": people_count - self.max_capacity
                }
            )
        elif people_count > self.max_capacity * 0.9:
            # Warning at 90% capacity
            self.alert_manager.trigger(
                vertical="restaurant",
                alert_type="NEAR_CAPACITY",
                severity="MEDIUM",
                message=f"Restaurant near capacity: {people_count}/{self.max_capacity}",
                confidence=0.9,
                cooldown=self.alert_cooldown * 2,
                metadata={
                    "current_count": people_count,
                    "max_capacity": self.max_capacity
                }
            )
    
    def _check_long_stays(self, current_time: float):
        """Check for customers staying longer than threshold"""
        self.metrics["long_stays"] = 0
        
        for person_id, track_data in self.person_tracks.items():
            dwell_time = current_time - track_data['first_seen']
            
            if dwell_time > self.dwell_time_threshold:
                self.metrics["long_stays"] += 1
                
                # Only alert once when threshold is first exceeded
                if not track_data.get('long_stay_alerted', False):
                    minutes = int(dwell_time / 60)
                    
                    self.alert_manager.trigger(
                        vertical="restaurant",
                        alert_type="LONG_DWELL_TIME",
                        severity="LOW",
                        message=f"Customer exceeded typical dwell time: {minutes} minutes",
                        confidence=0.8,
                        cooldown=self.alert_cooldown,
                        metadata={
                            "person_id": person_id,
                            "dwell_time_minutes": minutes,
                            "threshold_minutes": int(self.dwell_time_threshold / 60)
                        }
                    )
                    
                    track_data['long_stay_alerted'] = True
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset metrics"""
        self.person_tracks.clear()
        self.table_states.clear()
        self.next_person_id = 0
        self.next_table_id = 0
