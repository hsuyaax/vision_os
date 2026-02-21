"""
VisionSync - Main FastAPI Application
Multi-camera AI surveillance system with vertical-specific logic
"""
import asyncio
import json
import logging
import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Import our modules
from camera_manager import CameraManager
from db import DatabaseManager
from alert_manager import AlertManager
from inference_engine import InferenceEngine
from logic.safety import SafetyProcessor
from logic.traffic import TrafficProcessor
from logic.manufacturing import ManufacturingProcessor
from logic.restaurant import RestaurantProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global state
app_state = {
    "camera": None,
    "engine": None,
    "db": None,
    "alert_manager": None,
    "vertical_processor": None,
    "current_vertical": None,
    "config": None
}


# Load configuration
def load_config():
    config_path = "config.json"
    # Try parent directory if not found
    if not os.path.exists(config_path):
        config_path = os.path.join("..", "config.json")
    
    try:
        with open(config_path, "r") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load config: {e}")
        return {}


# Initialize components
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources"""
    logger.info("Starting VisionSync...")
    
    # Load config
    app_state["config"] = load_config()
    
    # Initialize database
    db_path = app_state["config"].get("database", {}).get("path", "events.db")
    app_state["db"] = DatabaseManager(db_path)
    
    # Initialize alert manager
    app_state["alert_manager"] = AlertManager(app_state["db"])
    
    # Initialize inference engine
    app_state["engine"] = InferenceEngine("config.json")
    
    logger.info("VisionSync started successfully")
    
    yield
    
    # Cleanup
    logger.info("Shutting down VisionSync...")
    
    if app_state["camera"]:
        app_state["camera"].stop()
    
    if app_state["db"]:
        app_state["db"].close()
    
    logger.info("VisionSync stopped")


# Create FastAPI app
app = FastAPI(
    title="VisionSync API",
    description="Multi-camera AI surveillance with vertical-specific logic",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models
class FeedStartRequest(BaseModel):
    source: str  # Video file path or camera index (0, 1, etc.)
    vertical: str  # safety, traffic, manufacturing, restaurant


class ConfigUpdateRequest(BaseModel):
    vertical: str
    config: dict


# Routes
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "name": "VisionSync API",
        "version": "1.0.0",
        "status": "running",
        "current_vertical": app_state.get("current_vertical")
    }


@app.post("/api/feed/start")
async def start_feed(request: FeedStartRequest):
    """Start video feed with specific vertical logic"""
    try:
        # Stop existing camera if running
        if app_state["camera"] and app_state["camera"].is_alive():
            app_state["camera"].stop()
        
        # Validate vertical
        if request.vertical not in ["safety", "traffic", "manufacturing", "restaurant"]:
            raise HTTPException(status_code=400, detail="Invalid vertical")
        
        # Parse source (handle both file paths and camera indices)
        source = request.source
        try:
            source = int(source)  # Try to convert to int for camera index
        except ValueError:
            pass  # Keep as string for file path
        
        # Start camera
        app_state["camera"] = CameraManager(source=source, loop_video=True)
        app_state["camera"].start()
        
        # Load model for vertical
        app_state["engine"].load_vertical(request.vertical)
        app_state["current_vertical"] = request.vertical
        
        # Initialize vertical processor
        vertical_config = app_state["config"]["verticals"][request.vertical]
        
        if request.vertical == "safety":
            app_state["vertical_processor"] = SafetyProcessor(
                vertical_config, app_state["alert_manager"]
            )
        elif request.vertical == "traffic":
            app_state["vertical_processor"] = TrafficProcessor(
                vertical_config, app_state["alert_manager"]
            )
        elif request.vertical == "manufacturing":
            app_state["vertical_processor"] = ManufacturingProcessor(
                vertical_config, app_state["alert_manager"]
            )
        elif request.vertical == "restaurant":
            app_state["vertical_processor"] = RestaurantProcessor(
                vertical_config, app_state["alert_manager"]
            )
        
        logger.info(f"Started feed: {source} with vertical: {request.vertical}")
        
        return {
            "status": "success",
            "message": f"Feed started with {request.vertical} vertical",
            "source": str(source),
            "vertical": request.vertical
        }
    
    except Exception as e:
        logger.error(f"Failed to start feed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/feed/stop")
async def stop_feed():
    """Stop current video feed"""
    if app_state["camera"]:
        app_state["camera"].stop()
        app_state["camera"] = None
        app_state["current_vertical"] = None
        app_state["vertical_processor"] = None
        return {"status": "success", "message": "Feed stopped"}
    
    return {"status": "error", "message": "No active feed"}


@app.get("/stream")
async def video_stream():
    """MJPEG video stream with inference overlay"""
    if not app_state["camera"] or not app_state["camera"].is_alive():
        raise HTTPException(status_code=404, detail="No active camera feed")
    
    if not app_state["engine"]:
        raise HTTPException(status_code=500, detail="Inference engine not initialized")
    
    return StreamingResponse(
        app_state["engine"].generate_frames(
            app_state["camera"],
            process_callback=process_frame
        ),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


def process_frame(inference_result: dict):
    """Callback to process each inference result"""
    if app_state["vertical_processor"]:
        # Run vertical-specific logic
        metrics = app_state["vertical_processor"].process(inference_result)
        
        # Store metrics in database
        for metric_name, metric_value in metrics.items():
            if isinstance(metric_value, (int, float)):
                app_state["db"].insert_metric(
                    vertical=app_state["current_vertical"],
                    metric_name=metric_name,
                    metric_value=float(metric_value)
                )


@app.websocket("/ws/stats")
async def websocket_stats(websocket: WebSocket):
    """WebSocket endpoint for real-time statistics"""
    await websocket.accept()
    logger.info("WebSocket client connected for stats")
    
    try:
        while True:
            if app_state["vertical_processor"] and app_state["current_vertical"]:
                # Get current metrics
                metrics = app_state["vertical_processor"].get_metrics()
                
                # Prepare payload
                payload = {
                    "vertical": app_state["current_vertical"],
                    "timestamp": int(asyncio.get_event_loop().time()),
                    "fps": app_state["camera"].fps if app_state["camera"] else 0,
                    "metrics": metrics
                }
                
                await websocket.send_json(payload)
            
            await asyncio.sleep(1)  # Send updates every second
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time alerts"""
    await websocket.accept()
    logger.info("WebSocket client connected for alerts")
    
    # Subscribe to alerts
    async def send_alert(alert: dict):
        try:
            await websocket.send_json(alert)
        except Exception as e:
            logger.error(f"Failed to send alert: {e}")
    
    app_state["alert_manager"].subscribe(send_alert)
    
    try:
        while True:
            # Keep connection alive
            await asyncio.sleep(1)
    
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
        app_state["alert_manager"].unsubscribe(send_alert)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        app_state["alert_manager"].unsubscribe(send_alert)


@app.get("/api/stats")
async def get_stats():
    """Get current statistics"""
    if not app_state["vertical_processor"]:
        return {"error": "No active feed"}
    
    return {
        "vertical": app_state["current_vertical"],
        "metrics": app_state["vertical_processor"].get_metrics(),
        "camera": app_state["camera"].get_info() if app_state["camera"] else {},
        "engine": app_state["engine"].get_stats() if app_state["engine"] else {}
    }


@app.get("/api/events")
async def get_events(
    vertical: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 100
):
    """Get recent events from database"""
    events = app_state["db"].get_events(
        vertical=vertical,
        severity=severity,
        limit=limit
    )
    return {"events": events, "count": len(events)}


@app.get("/api/metrics/history")
async def get_metrics_history(
    vertical: str,
    metric_name: Optional[str] = None,
    hours: int = 24
):
    """Get metrics history"""
    metrics = app_state["db"].get_metrics(
        vertical=vertical,
        metric_name=metric_name,
        hours=hours
    )
    return {"metrics": metrics, "count": len(metrics)}


@app.get("/api/alerts/recent")
async def get_recent_alerts(vertical: Optional[str] = None, limit: int = 50):
    """Get recent alerts"""
    alerts = app_state["alert_manager"].get_recent_alerts(vertical=vertical, limit=limit)
    return {"alerts": alerts, "count": len(alerts)}


@app.get("/api/db/stats")
async def get_db_stats():
    """Get database statistics"""
    return app_state["db"].get_stats()


@app.get("/api/verticals")
async def get_verticals():
    """List available verticals and their status"""
    config = app_state.get("config", {})
    verticals_config = config.get("verticals", {})
    verticals = []
    for name, vcfg in verticals_config.items():
        verticals.append({
            "name": name,
            "model": vcfg.get("model", "yolov8n.pt"),
            "active": app_state.get("current_vertical") == name,
            "confidence_threshold": vcfg.get("confidence_threshold", 0.5)
        })
    return {"verticals": verticals, "active": app_state.get("current_vertical")}


class ZoneSetRequest(BaseModel):
    vertical: str
    zones: list  # List of polygons: [[x1,y1,x2,y2,...], ...]


@app.post("/api/zones/set")
async def set_zones(request: ZoneSetRequest):
    """Define restricted zones for a vertical"""
    config = app_state.get("config", {})
    verticals_config = config.get("verticals", {})
    if request.vertical not in verticals_config:
        raise HTTPException(status_code=400, detail=f"Unknown vertical: {request.vertical}")
    
    # Update zones in config
    verticals_config[request.vertical]["zones"] = request.zones
    
    # If this vertical is currently active, update the processor
    if app_state.get("current_vertical") == request.vertical and app_state.get("vertical_processor"):
        if hasattr(app_state["vertical_processor"], 'zones'):
            app_state["vertical_processor"].zones = request.zones
    
    return {
        "status": "success",
        "message": f"Set {len(request.zones)} zones for {request.vertical}",
        "zones": request.zones
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "camera_active": app_state["camera"] is not None and app_state["camera"].is_alive(),
        "current_vertical": app_state["current_vertical"],
        "database": "connected" if app_state["db"] else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    
    # Load config for server settings
    config = load_config()
    server_config = config.get("server", {})
    
    uvicorn.run(
        app,
        host=server_config.get("host", "0.0.0.0"),
        port=server_config.get("port", 8000),
        log_level="info"
    )
