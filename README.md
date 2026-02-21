# VisionSync - Multi-Camera AI Surveillance System

A real-time AI-powered surveillance system with vertical-specific logic for Safety, Traffic, Manufacturing, and Restaurant monitoring.

## 🚀 Quick Start

### Prerequisites
- Python 3.12+ (already installed at: `C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe`)
- Web browser (Chrome, Firefox, or Edge recommended)

### Installation

All dependencies are already installed! The system includes:
- ultralytics (YOLOv8)
- supervision
- fastapi & uvicorn
- opencv-python
- websockets
- and more...

## 📁 Project Structure

```
vision_os/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── camera_manager.py    # Video capture handling
│   ├── inference_engine.py  # YOLOv8 inference
│   ├── db.py                # SQLite database
│   ├── alert_manager.py     # Alert system
│   ├── logic/
│   │   ├── safety.py        # PPE & fall detection
│   │   ├── traffic.py       # Vehicle counting
│   │   ├── manufacturing.py # Defect detection
│   │   └── restaurant.py    # Occupancy tracking
│   └── models/              # AI model weights go here
├── frontend/
│   ├── index.html           # Dashboard UI
│   ├── dashboard.js         # WebSocket client
│   └── styles.css           # Styling
├── demo/                    # Demo videos go here
└── config.json              # Configuration file
```

## 🎬 Getting Demo Videos

### Option 1: Download from Pexels (Free, No Login Required)

1. **Safety/Construction Videos:**
   - Visit: https://www.pexels.com/search/videos/construction%20worker/
   - Download any construction site video
   - Save as: `demo/safety_sample.mp4`

2. **Traffic Videos:**
   - Visit: https://www.pexels.com/search/videos/traffic/
   - Download a video with vehicles
   - Save as: `demo/traffic_sample.mp4`

3. **Manufacturing Videos:**
   - Visit: https://www.pexels.com/search/videos/factory/
   - Download a factory/assembly line video
   - Save as: `demo/manufacturing_sample.mp4`

4. **Restaurant Videos:**
   - Visit: https://www.pexels.com/search/videos/restaurant/
   - Download a restaurant interior video
   - Save as: `demo/restaurant_sample.mp4`

### Option 2: Use Webcam
- Simply use `0` as the video source to use your webcam

### Option 3: YouTube Downloads
Use a YouTube downloader (e.g., yt-dlp) to download sample videos:
```powershell
# Example search terms:
# "construction site time lapse"
# "traffic intersection camera"
# "factory production line"
# "restaurant security camera"
```

## 🏃 Running the System

### Step 1: Start the Backend Server

Open PowerShell and run:

```powershell
cd "C:\Users\aggar\OneDrive\Desktop\vision_os\backend"
C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe main.py
```

The server will start on: http://localhost:8000

You should see:
```
INFO: Started server process
INFO: Waiting for application startup.
INFO: VisionSync started successfully
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Open the Dashboard

1. Open your web browser
2. Navigate to: `C:\Users\aggar\OneDrive\Desktop\vision_os\frontend\index.html`
3. Or open the file directly in your browser

### Step 3: Start a Feed

1. In the dashboard sidebar:
   - **Video Source:** Enter `0` for webcam OR path to video like `../demo/safety_sample.mp4`
   - **Select Vertical:** Choose your use case (Safety, Traffic, Manufacturing, Restaurant)
   - Click **"Start Feed"**

2. The video stream will appear with AI detections overlaid
3. Metrics will update in real-time
4. Alerts will appear in the sidebar and as toast notifications

## 🎯 Verticals Explained

### 🦺 Safety
- **Detects:** People, PPE (helmets, vests)
- **Alerts for:**
  - PPE violations (missing helmet/vest)
  - Fall detection (horizontal person)
  - Restricted zone intrusions
- **Use Case:** Construction sites, warehouses, factories

### 🚗 Traffic
- **Detects:** Vehicles (cars, trucks, buses, motorcycles, bicycles)
- **Alerts for:**
  - Speed violations
  - Counting line crossings
- **Metrics:** Vehicle counts by type, average speed
- **Use Case:** Traffic monitoring, parking lots

### 🏭 Manufacturing
- **Detects:** Products, defects, scratches, dents
- **Alerts for:**
  - Defective products
  - High defect rates
- **Metrics:** Pass/fail rate, defect counts
- **Use Case:** Quality control, assembly lines

### 🍽️ Restaurant
- **Detects:** People, tables, chairs
- **Alerts for:**
  - Capacity exceeded
  - Long customer dwell times
- **Metrics:** Occupancy rate, table status, avg dwell time
- **Use Case:** Restaurant management, occupancy monitoring

## 📊 Dashboard Features

### Real-time Video Stream
- Live video with AI detections overlaid
- Bounding boxes with class labels and confidence scores
- FPS counter

### Metrics Cards
- 4 key metrics updated in real-time
- Different metrics for each vertical

### Analytics Chart
- Real-time line chart of primary metric
- Last 20 data points displayed

### Event Log
- Table of all events/alerts
- Filterable by time, type, severity

### Alerts Sidebar
- Real-time alert notifications
- Last 10 alerts displayed
- Color-coded by severity

## 🔧 Configuration

Edit `config.json` to customize:

```json
{
  "verticals": {
    "safety": {
      "ppe_required": ["helmet", "vest"],
      "alert_cooldown": 15,
      "confidence_threshold": 0.7
    },
    "traffic": {
      "speed_limit": 50,
      "vehicle_classes": ["car", "truck", "bus"]
    }
    // ... etc
  }
}
```

## 🧪 Testing the System

### Test with Webcam (Quick Test)
1. Start backend server
2. Open dashboard
3. Source: `0`, Vertical: `Safety`
4. Click "Start Feed"
5. Wave your hand or move around - you'll be detected as "person"

### Test with Video File
1. Download a demo video to the `demo/` folder
2. Start backend server
3. Open dashboard  
4. Source: `../demo/safety_sample.mp4`
5. Vertical: `Safety`
6. Click "Start Feed"
7. Video will loop automatically

## 🐛 Troubleshooting

### Backend won't start
- Check Python path is correct
- Verify all packages are installed: `python -m pip list`
- Check port 8000 isn't already in use

### Video stream not showing
- Make sure backend is running
- Check browser console (F12) for errors
- Verify video source path is correct
- Try using `0` for webcam first

### WebSocket connection fails
- Refresh the page
- Check backend logs for errors
- Ensure firewall isn't blocking localhost:8000

### Low FPS / Slow inference
- YOLOv8n is the fastest model
- Reduce camera resolution in config.json
- Close other resource-intensive applications

## 📝 API Endpoints

- `POST /api/feed/start` - Start video feed
- `POST /api/feed/stop` - Stop video feed
- `GET /stream` - MJPEG video stream
- `WS /ws/stats` - Real-time statistics WebSocket
- `WS /ws/alerts` - Real-time alerts WebSocket
- `GET /api/events` - Get event history
- `GET /api/stats` - Get current statistics
- `GET /api/health` - Health check

Full API docs: http://localhost:8000/docs (when server is running)

## 🎓 Next Steps

1. **Get Better Models:**
   - PPE Detection: `keremberke/yolov8m-hard-hat-detection` (HuggingFace)
   - Vehicle Detection: `yolov8m.pt` or `yolov8l.pt` for better accuracy

2. **Add Custom Models:**
   - Put `.pt` files in `backend/models/`
   - Update model paths in `config.json`

3. **Customize Alerts:**
   - Edit alert thresholds in `config.json`
   - Modify cooldown times
   - Add custom alert logic in vertical processors

4. **Deploy:**
   - Change `host` in config from `0.0.0.0` to your server IP
   - Set up proper CORS origins
   - Use production ASGI server (gunicorn)

## 📚 Resources

- **YOLOv8 Docs:** https://docs.ultralytics.com/
- **FastAPI Docs:** https://fastapi.tiangolo.com/
- **Supervision Docs:** https://supervision.roboflow.com/
- **Free Videos:** https://www.pexels.com/videos/

## ⚡ Quick Commands

```powershell
# Start backend
cd backend
C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe main.py

# Check errors
# Look at terminal output for logs

# Stop server
# Press Ctrl+C in terminal
```

## 🎉 You're Ready!

Your VisionSync system is fully built and ready to use. Start with a webcam test, then try demo videos for each vertical.

Happy monitoring! 🚀
