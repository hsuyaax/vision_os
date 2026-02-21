"""
Camera Manager - Handles video capture from files or live streams
"""
import cv2
import threading
import queue
import time
import logging

logger = logging.getLogger(__name__)


class CameraManager:
    def __init__(self, source=0, buffer_size=2, loop_video=True):
        """
        Initialize camera manager
        
        Args:
            source: Video source (0 for webcam, path for video file)
            buffer_size: Max frames to keep in queue
            loop_video: Whether to loop video files (useful for demos)
        """
        self.source = source
        self.buffer_size = buffer_size
        self.loop_video = loop_video
        self.frame_queue = queue.Queue(maxsize=buffer_size)
        self.capture = None
        self.thread = None
        self.running = False
        self.fps = 30
        self.frame_count = 0
        
    def start(self):
        """Start the camera capture thread"""
        if self.running:
            logger.warning("Camera already running")
            return
            
        self.capture = cv2.VideoCapture(self.source)
        if not self.capture.isOpened():
            raise RuntimeError(f"Failed to open video source: {self.source}")
        
        # Get video properties
        self.fps = self.capture.get(cv2.CAP_PROP_FPS) or 30
        logger.info(f"Camera started: {self.source} @ {self.fps} FPS")
        
        self.running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        
    def _capture_loop(self):
        """Background thread that continuously reads frames"""
        while self.running:
            ret, frame = self.capture.read()
            
            # Handle video looping for demo files
            if not ret:
                if self.loop_video and isinstance(self.source, str):
                    logger.info("Looping video file")
                    self.capture.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                else:
                    logger.warning("No more frames available")
                    break
            
            self.frame_count += 1
            
            # Resize frame to 640x480 for consistent processing
            if frame.shape[1] != 640 or frame.shape[0] != 480:
                frame = cv2.resize(frame, (640, 480))
            
            # Add to queue, drop old frames if full
            if self.frame_queue.full():
                try:
                    self.frame_queue.get_nowait()
                except queue.Empty:
                    pass
            
            try:
                self.frame_queue.put(frame, block=False)
            except queue.Full:
                pass
                
            # Control frame rate
            time.sleep(1 / self.fps)
    
    def get_frame(self, timeout=1.0):
        """
        Get the latest frame
        
        Returns:
            numpy.ndarray: BGR frame or None if not available
        """
        try:
            return self.frame_queue.get(timeout=timeout)
        except queue.Empty:
            return None
    
    def stop(self):
        """Stop the camera capture"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=2.0)
        if self.capture:
            self.capture.release()
        logger.info("Camera stopped")
        
    def is_alive(self):
        """Check if camera is running"""
        return self.running and self.thread and self.thread.is_alive()
    
    def get_info(self):
        """Get camera information"""
        return {
            "source": self.source,
            "fps": self.fps,
            "running": self.is_alive(),
            "frame_count": self.frame_count,
            "queue_size": self.frame_queue.qsize()
        }
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        self.stop()
