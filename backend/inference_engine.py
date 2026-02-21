"""
Inference Engine - YOLOv8 model loading and inference
"""
import cv2
import numpy as np
import logging
import os
from typing import Dict, List, Optional, Tuple
from ultralytics import YOLO
import json

logger = logging.getLogger(__name__)


class InferenceEngine:
    def __init__(self, config_path="config.json"):
        """Initialize inference engine with configuration"""
        self.config_path = config_path
        # Try parent directory if not found
        if not os.path.exists(config_path):
            self.config_path = os.path.join("..", config_path)
        self.config = self._load_config()
        self.models = {}  # Cache loaded models
        self.current_vertical = None
        self.current_model = None
        self.frame_count = 0
        
    def _load_config(self) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            return {"verticals": {}}
    
    def load_vertical(self, vertical: str):
        """
        Load model for a specific vertical
        
        Args:
            vertical: Vertical name (safety, traffic, manufacturing, restaurant)
        """
        if vertical not in self.config.get('verticals', {}):
            raise ValueError(f"Unknown vertical: {vertical}")
        
        vertical_config = self.config['verticals'][vertical]
        model_path = vertical_config.get('model', 'yolov8n.pt')
        
        # Check if model is already loaded
        if vertical in self.models:
            logger.info(f"Using cached model for {vertical}")
            self.current_model = self.models[vertical]
            self.current_vertical = vertical
            return
        
        # Load model
        try:
            logger.info(f"Loading model {model_path} for {vertical}...")
            model = YOLO(model_path)
            self.models[vertical] = model
            self.current_model = model
            self.current_vertical = vertical
            logger.info(f"Model loaded successfully for {vertical}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise
    
    def infer(self, frame: np.ndarray, conf_threshold: Optional[float] = None) -> Dict:
        """
        Run inference on a frame
        
        Args:
            frame: BGR image as numpy array
            conf_threshold: Confidence threshold (uses config default if None)
            
        Returns:
            Dictionary with detections, metadata, and annotated frame
        """
        if self.current_model is None:
            raise RuntimeError("No model loaded. Call load_vertical() first.")
        
        self.frame_count += 1
        
        # Get confidence threshold from config if not provided
        if conf_threshold is None:
            vertical_config = self.config['verticals'][self.current_vertical]
            conf_threshold = vertical_config.get('confidence_threshold', 0.5)
        
        # Run inference
        results = self.current_model(frame, conf=conf_threshold, verbose=False)
        
        # Parse results
        detections = []
        annotated_frame = frame.copy()
        
        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for i, box in enumerate(boxes):
                # Extract data
                xyxy = box.xyxy[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                class_name = result.names[cls]
                
                detection = {
                    "id": i,
                    "class": class_name,
                    "confidence": round(conf, 3),
                    "bbox": {
                        "x1": int(xyxy[0]),
                        "y1": int(xyxy[1]),
                        "x2": int(xyxy[2]),
                        "y2": int(xyxy[3])
                    }
                }
                detections.append(detection)
                
                # Draw on frame
                x1, y1, x2, y2 = int(xyxy[0]), int(xyxy[1]), int(xyxy[2]), int(xyxy[3])
                
                # Color based on class
                color = self._get_color_for_class(class_name)
                
                # Draw bounding box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                
                # Draw label
                label = f"{class_name} {conf:.2f}"
                label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                cv2.rectangle(
                    annotated_frame,
                    (x1, y1 - label_size[1] - 10),
                    (x1 + label_size[0], y1),
                    color,
                    -1
                )
                cv2.putText(
                    annotated_frame,
                    label,
                    (x1, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    (255, 255, 255),
                    1
                )
        
        return {
            "detections": detections,
            "frame_count": self.frame_count,
            "vertical": self.current_vertical,
            "annotated_frame": annotated_frame,
            "timestamp": int(time.time())
        }
    
    def _get_color_for_class(self, class_name: str) -> Tuple[int, int, int]:
        """Get BGR color for a class name"""
        # Simple hash-based color generation
        hash_val = hash(class_name) % 256
        return (
            (hash_val * 50) % 256,
            (hash_val * 100) % 256,
            (hash_val * 150) % 256
        )
    
    def generate_frames(
        self,
        camera_manager,
        process_callback=None
    ):
        """
        Generator that yields annotated frames as MJPEG stream
        
        Args:
            camera_manager: CameraManager instance
            process_callback: Optional callback(inference_result) for processing
            
        Yields:
            JPEG-encoded frame bytes
        """
        while camera_manager.is_alive():
            frame = camera_manager.get_frame(timeout=1.0)
            if frame is None:
                continue
            
            try:
                # Run inference
                result = self.infer(frame)
                
                # Call processing callback if provided
                if process_callback:
                    process_callback(result)
                
                # Encode frame as JPEG
                _, buffer = cv2.imencode('.jpg', result['annotated_frame'])
                frame_bytes = buffer.tobytes()
                
                # Yield as MJPEG chunk
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            except Exception as e:
                logger.error(f"Error processing frame: {e}")
                continue
    
    def get_stats(self) -> Dict:
        """Get inference statistics"""
        return {
            "current_vertical": self.current_vertical,
            "loaded_models": list(self.models.keys()),
            "frame_count": self.frame_count,
            "model_info": {
                "name": self.current_model.ckpt_path if self.current_model else None
            } if self.current_model else {}
        }


# Import time
import time
