"""
Safety Vertical Logic - PPE detection, fall detection, zone monitoring
"""
import logging
from typing import Dict, List, Optional
import time

logger = logging.getLogger(__name__)


class SafetyProcessor:
    def __init__(self, config: Dict, alert_manager):
        """
        Initialize safety processor
        
        Args:
            config: Safety vertical configuration
            alert_manager: AlertManager instance for triggering alerts
        """
        self.config = config
        self.alert_manager = alert_manager
        self.ppe_required = config.get('ppe_required', ['helmet', 'vest'])
        self.zones = config.get('zones', [])
        self.fall_detection_enabled = config.get('fall_detection_enabled', True)
        self.alert_cooldown = config.get('alert_cooldown', 15)
        
        # Tracking
        self.person_states = {}  # Track person positions over time
        self.frame_count = 0
        
        # Metrics
        self.metrics = {
            "people_count": 0,
            "ppe_compliant": 0,
            "ppe_violations": 0,
            "zone_intrusions": 0,
            "falls_detected": 0
        }
    
    def process(self, inference_result: Dict) -> Dict:
        """
        Process safety-related detections
        
        Args:
            inference_result: Result from inference engine
            
        Returns:
            Updated metrics and alerts
        """
        self.frame_count += 1
        detections = inference_result.get('detections', [])
        
        # Reset counters
        self.metrics["people_count"] = 0
        self.metrics["ppe_compliant"] = 0
        people_detected = []
        ppe_detected = []
        
        # Separate people and PPE detections
        for det in detections:
            class_name = det.get('class', '').lower()
            
            if 'person' in class_name:
                people_detected.append(det)
                self.metrics["people_count"] += 1
            elif class_name in ['helmet', 'vest', 'gloves', 'safety', 'hardhat', 'hard-hat']:
                ppe_detected.append(det)
        
        # Check PPE compliance
        self._check_ppe_compliance(people_detected, ppe_detected)
        
        # Check zone intrusions
        if self.zones:
            self._check_zones(people_detected)
        
        # Check for falls
        if self.fall_detection_enabled:
            self._check_falls(people_detected)
        
        return self.metrics.copy()
    
    def _check_ppe_compliance(self, people: List[Dict], ppe: List[Dict]):
        """Check if people are wearing required PPE"""
        for person in people:
            person_bbox = person['bbox']
            person_center_x = (person_bbox['x1'] + person_bbox['x2']) / 2
            person_center_y = (person_bbox['y1'] + person_bbox['y2']) / 2
            
            # Find PPE near this person
            nearby_ppe = []
            for ppe_item in ppe:
                ppe_bbox = ppe_item['bbox']
                ppe_center_x = (ppe_bbox['x1'] + ppe_bbox['x2']) / 2
                ppe_center_y = (ppe_bbox['y1'] + ppe_bbox['y2']) / 2
                
                # Check if PPE is within person's bounding box area
                if (person_bbox['x1'] <= ppe_center_x <= person_bbox['x2'] and
                    person_bbox['y1'] <= ppe_center_y <= person_bbox['y2']):
                    nearby_ppe.append(ppe_item['class'].lower())
            
            # Check if required PPE is present
            missing_ppe = []
            for required in self.ppe_required:
                found = False
                for detected_ppe in nearby_ppe:
                    if required.lower() in detected_ppe or detected_ppe in required.lower():
                        found = True
                        break
                if not found:
                    missing_ppe.append(required)
            
            if missing_ppe:
                # PPE violation detected
                self.metrics["ppe_violations"] += 1
                
                message = f"Worker without {', '.join(missing_ppe)} detected"
                self.alert_manager.trigger(
                    vertical="safety",
                    alert_type="PPE_VIOLATION",
                    severity="HIGH",
                    message=message,
                    confidence=person.get('confidence', 0.8),
                    cooldown=self.alert_cooldown,
                    metadata={
                        "missing_ppe": missing_ppe,
                        "person_bbox": person_bbox
                    }
                )
            else:
                self.metrics["ppe_compliant"] += 1
    
    def _check_zones(self, people: List[Dict]):
        """Check for restricted zone intrusions"""
        if not self.zones:
            return
        
        self.metrics["zone_intrusions"] = 0
        
        for person in people:
            bbox = person['bbox']
            person_center_x = (bbox['x1'] + bbox['x2']) / 2
            person_center_y = (bbox['y1'] + bbox['y2']) / 2
            
            for zone in self.zones:
                # Check if person center is in zone
                if self._point_in_polygon((person_center_x, person_center_y), zone.get('polygon', [])):
                    self.metrics["zone_intrusions"] += 1
                    
                    self.alert_manager.trigger(
                        vertical="safety",
                        alert_type="ZONE_INTRUSION",
                        severity="MEDIUM",
                        message=f"Unauthorized access to {zone.get('name', 'restricted zone')}",
                        confidence=person.get('confidence', 0.8),
                        cooldown=self.alert_cooldown,
                        metadata={
                            "zone_name": zone.get('name'),
                            "person_bbox": bbox
                        }
                    )
    
    def _check_falls(self, people: List[Dict]):
        """Detect potential falls based on aspect ratio"""
        for person in people:
            bbox = person['bbox']
            width = bbox['x2'] - bbox['x1']
            height = bbox['y2'] - bbox['y1']
            
            # If person bounding box is wider than tall, might be a fall
            aspect_ratio = width / height if height > 0 else 0
            
            if aspect_ratio > 1.3:  # Horizontal person
                self.metrics["falls_detected"] += 1
                
                self.alert_manager.trigger(
                    vertical="safety",
                    alert_type="FALL_DETECTED",
                    severity="HIGH",
                    message="Potential fall detected - immediate attention required",
                    confidence=person.get('confidence', 0.7),
                    cooldown=5,  # Shorter cooldown for critical events
                    metadata={
                        "aspect_ratio": round(aspect_ratio, 2),
                        "person_bbox": bbox
                    }
                )
    
    def _point_in_polygon(self, point: tuple, polygon: List[tuple]) -> bool:
        """Check if a point is inside a polygon using ray casting"""
        if len(polygon) < 3:
            return False
        
        x, y = point
        inside = False
        
        j = len(polygon) - 1
        for i in range(len(polygon)):
            xi, yi = polygon[i]
            xj, yj = polygon[j]
            
            if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
                inside = not inside
            
            j = i
        
        return inside
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        return self.metrics.copy()
    
    def reset_metrics(self):
        """Reset all metrics to zero"""
        for key in self.metrics:
            self.metrics[key] = 0
