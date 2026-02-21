"""
Traffic Vertical Logic - Vehicle counting, speed estimation, violation detection
"""
import logging
from typing import Dict, List, Optional, Tuple
import time
from collections import defaultdict

logger = logging.getLogger(__name__)


class TrafficProcessor:
    def __init__(self, config: Dict, alert_manager):
        """
        Initialize traffic processor
        
        Args:
            config: Traffic vertical configuration
            alert_manager: AlertManager instance for triggering alerts
        """
        self.config = config
        self.alert_manager = alert_manager
        self.vehicle_classes = config.get('vehicle_classes', ['car', 'truck', 'bus', 'motorcycle', 'bicycle'])
        self.counting_lines = config.get('counting_lines', [])
        self.speed_limit = config.get('speed_limit', 50)
        self.alert_cooldown = config.get('alert_cooldown', 5)
        
        # Tracking
        self.vehicle_tracks = {}  # vehicle_id -> [positions over time]
        self.crossed_vehicles = set()  # IDs that crossed counting line
        self.next_vehicle_id = 0
        
        # Metrics
        self.metrics = {
            "vehicle_count": 0,
            "cars": 0,
            "trucks": 0,
            "buses": 0,
            "motorcycles": 0,
            "bicycles": 0,
            "total_crossed": 0,
            "violations": 0,
            "avg_speed": 0
        }
    
    def process(self, inference_result: Dict) -> Dict:
        """
        Process traffic-related detections
        
        Args:
            inference_result: Result from inference engine
            
        Returns:
            Updated metrics
        """
        detections = inference_result.get('detections', [])
        
        # Reset frame counters
        self.metrics["vehicle_count"] = 0
        self.metrics["cars"] = 0
        self.metrics["trucks"] = 0
        self.metrics["buses"] = 0
        self.metrics["motorcycles"] = 0
        self.metrics["bicycles"] = 0
        
        # Count vehicles by type
        vehicles = []
        for det in detections:
            class_name = det.get('class', '').lower()
            
            # Check if it's a vehicle
            is_vehicle = any(v in class_name for v in self.vehicle_classes)
            if is_vehicle:
                self.metrics["vehicle_count"] += 1
                vehicles.append(det)
                
                # Count by specific type
                if 'car' in class_name:
                    self.metrics["cars"] += 1
                elif 'truck' in class_name:
                    self.metrics["trucks"] += 1
                elif 'bus' in class_name:
                    self.metrics["buses"] += 1
                elif 'motorcycle' in class_name or 'bike' in class_name:
                    self.metrics["motorcycles"] += 1
                elif 'bicycle' in class_name:
                    self.metrics["bicycles"] += 1
        
        # Track vehicles for speed and counting
        if vehicles:
            self._track_vehicles(vehicles, inference_result.get('timestamp', time.time()))
        

        # Check counting lines
        if self.counting_lines:
            self._check_counting_lines(vehicles)
        
        # Check for speed violations
        self.check_speed_violations()
        
        return self.metrics.copy()
    
    def _track_vehicles(self, vehicles: List[Dict], timestamp: float):
        """Simple vehicle tracking based on position proximity"""
        current_positions = {}
        
        for vehicle in vehicles:
            bbox = vehicle['bbox']
            center_x = (bbox['x1'] + bbox['x2']) / 2
            center_y = (bbox['y1'] + bbox['y2']) / 2
            
            # Find closest existing track
            min_distance = float('inf')
            closest_id = None
            
            for vid, track in self.vehicle_tracks.items():
                if len(track) > 0:
                    last_pos = track[-1]
                    distance = ((center_x - last_pos['x'])**2 + (center_y - last_pos['y'])**2)**0.5
                    
                    if distance < min_distance and distance < 100:  # Threshold for same vehicle
                        min_distance = distance
                        closest_id = vid
            
            # Create new track or update existing
            if closest_id is not None:
                vehicle_id = closest_id
            else:
                vehicle_id = self.next_vehicle_id
                self.next_vehicle_id += 1
                self.vehicle_tracks[vehicle_id] = []
            
            # Add position to track
            self.vehicle_tracks[vehicle_id].append({
                'x': center_x,
                'y': center_y,
                'timestamp': timestamp,
                'bbox': bbox,
                'class': vehicle.get('class')
            })
            
            # Keep only recent positions (last 30 frames)
            if len(self.vehicle_tracks[vehicle_id]) > 30:
                self.vehicle_tracks[vehicle_id] = self.vehicle_tracks[vehicle_id][-30:]
            
            current_positions[vehicle_id] = True
        
        # Remove old tracks
        ids_to_remove = []
        for vid in self.vehicle_tracks:
            if vid not in current_positions:
                ids_to_remove.append(vid)
        
        for vid in ids_to_remove:
            del self.vehicle_tracks[vid]
    
    def _check_counting_lines(self, vehicles: List[Dict]):
        """Check if vehicles crossed counting lines"""
        if not self.counting_lines:
            return
        
        for vehicle_id, track in self.vehicle_tracks.items():
            if len(track) < 2:
                continue
            
            # Check each counting line
            for line in self.counting_lines:
                line_start = line.get('start', (0, 0))
                line_end = line.get('end', (0, 0))
                
                # Check if vehicle crossed the line
                prev_pos = track[-2]
                curr_pos = track[-1]
                
                if self._line_crossing(
                    (prev_pos['x'], prev_pos['y']),
                    (curr_pos['x'], curr_pos['y']),
                    line_start,
                    line_end
                ):
                    if vehicle_id not in self.crossed_vehicles:
                        self.crossed_vehicles.add(vehicle_id)
                        self.metrics["total_crossed"] += 1
                        
                        logger.info(f"Vehicle {vehicle_id} crossed counting line")
    
    def _line_crossing(
        self,
        prev_point: Tuple[float, float],
        curr_point: Tuple[float, float],
        line_start: Tuple[float, float],
        line_end: Tuple[float, float]
    ) -> bool:
        """Check if a line segment crosses another line"""
        # Simple line intersection check
        def ccw(A, B, C):
            return (C[1]-A[1]) * (B[0]-A[0]) > (B[1]-A[1]) * (C[0]-A[0])
        
        A, B = prev_point, curr_point
        C, D = line_start, line_end
        
        return ccw(A,C,D) != ccw(B,C,D) and ccw(A,B,C) != ccw(A,B,D)
    
    def _estimate_speed(self, track: List[Dict]) -> float:
        """Estimate vehicle speed based on movement (simplified)"""
        if len(track) < 5:
            return 0.0
        
        # Use last 5 positions
        recent = track[-5:]
        
        start_pos = recent[0]
        end_pos = recent[-1]
        
        # Calculate pixel distance
        pixel_distance = ((end_pos['x'] - start_pos['x'])**2 + 
                         (end_pos['y'] - start_pos['y'])**2)**0.5
        
        # Calculate time difference
        time_diff = end_pos['timestamp'] - start_pos['timestamp']
        
        if time_diff <= 0:
            return 0.0
        
        # Rough conversion (would need calibration in real scenario)
        # Assuming ~10 pixels = 1 meter (very approximate)
        meters_per_second = (pixel_distance / 10) / time_diff
        kmph = meters_per_second * 3.6
        
        return kmph
    
    def check_speed_violations(self):
        """Check for speed limit violations"""
        speeds = []
        
        for vehicle_id, track in self.vehicle_tracks.items():
            if len(track) >= 5:
                speed = self._estimate_speed(track)
                speeds.append(speed)
                
                if speed > self.speed_limit:
                    self.metrics["violations"] += 1
                    
                    self.alert_manager.trigger(
                        vertical="traffic",
                        alert_type="SPEED_VIOLATION",
                        severity="MEDIUM",
                        message=f"Vehicle exceeding speed limit: {speed:.1f} km/h (limit: {self.speed_limit} km/h)",
                        confidence=0.7,
                        cooldown=self.alert_cooldown,
                        metadata={
                            "vehicle_id": vehicle_id,
                            "speed": round(speed, 1),
                            "speed_limit": self.speed_limit
                        }
                    )
        
        # Update average speed
        if speeds:
            self.metrics["avg_speed"] = round(sum(speeds) / len(speeds), 1)
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset metrics"""
        self.metrics["total_crossed"] = 0
        self.metrics["violations"] = 0
        self.crossed_vehicles.clear()
