# VisionSync — AI Surveillance OS

A real-time AI-powered multi-camera surveillance system with vertical-specific analytics for Safety, Traffic, Manufacturing, and Restaurant monitoring.

**Frontend:** Next.js 16 + TypeScript + Tailwind CSS v4 + shadcn/ui + Recharts  
**Backend:** FastAPI + Uvicorn + YOLOv8 (Ultralytics) + Supervision  
**Database:** SQLite  

---

## 🚀 Quick Start

### Prerequisites
- **Python 3.12+** (installed at `C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe`)
- **Node.js 18+** and npm
- Web browser (Chrome, Firefox, or Edge)

### Installation

**Backend dependencies** (already installed):
```
ultralytics, supervision, fastapi, uvicorn, opencv-python, websockets, python-multipart, huggingface_hub
```

**Frontend dependencies:**
```powershell
cd frontend
npm install
```

---

## 📁 Project Structure

```
vision_os/
├── backend/
│   ├── main.py              # FastAPI app (14 endpoints + 2 WebSockets)
│   ├── camera_manager.py    # Video capture & frame queue
│   ├── inference_engine.py  # YOLOv8 inference + MJPEG stream
│   ├── db.py                # SQLite database manager
│   ├── alert_manager.py     # Alert pub/sub with cooldown
│   ├── logic/
│   │   ├── __init__.py
│   │   ├── safety.py        # PPE compliance, fall detection, zone intrusion
│   │   ├── traffic.py       # Vehicle counting, speed estimation, violations
│   │   ├── manufacturing.py # Defect detection, pass rate, inspection
│   │   └── restaurant.py    # Occupancy tracking, dwell time, table mgmt
│   └── models/              # AI model weights (.pt files)
├── frontend/                # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx       # Root layout (dark theme, Toaster)
│   │   │   ├── page.tsx         # Overview dashboard
│   │   │   ├── monitor/page.tsx # Live video monitor
│   │   │   ├── analytics/page.tsx # Charts & events log
│   │   │   ├── alerts/page.tsx  # Alert timeline
│   │   │   └── settings/page.tsx # Configuration
│   │   ├── components/
│   │   │   ├── app-shell.tsx    # Layout wrapper with sidebar
│   │   │   ├── sidebar.tsx      # Desktop sidebar navigation
│   │   │   ├── mobile-nav.tsx   # Mobile sheet navigation
│   │   │   ├── providers.tsx    # VisionSync context provider
│   │   │   └── ui/             # 17 shadcn/ui components
│   │   ├── hooks/
│   │   │   └── use-vision-sync.ts # WebSocket + demo mode hook
│   │   └── lib/
│   │       ├── api.ts           # Backend API client
│   │       ├── demo-data.ts     # Simulated data for demo mode
│   │       └── utils.ts         # shadcn utilities
│   ├── components.json         # shadcn/ui config
│   ├── package.json
│   └── tsconfig.json
├── demo/                    # Demo videos go here
├── config.json              # System configuration
├── .gitignore
└── README.md
```

---

## 🏃 Running the System

### Step 1: Start the Backend

```powershell
cd "C:\Users\aggar\OneDrive\Desktop\vision_os\backend"
C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe main.py
```

Backend runs at: **http://localhost:8000**  
Interactive API docs: **http://localhost:8000/docs**

### Step 2: Start the Frontend

```powershell
cd "C:\Users\aggar\OneDrive\Desktop\vision_os\frontend"
npm run dev
```

Frontend runs at: **http://localhost:3000**

### Step 3: Use the App

1. Open **http://localhost:3000** in your browser
2. The dashboard loads in **Demo Mode** by default (simulated data, no backend needed)
3. To use live feeds, go to **Settings** → disable Demo Mode → test connection
4. Go to **Live Monitor** → enter a video source → select vertical → click **Start**

---

## 📺 Pages

### Dashboard (`/`)
- Hero stat cards: Detections, FPS, Latency, Uptime
- Real-time detection trend area chart
- Alert summary by severity (Critical / High / Medium)
- Vertical selector cards (click to switch active vertical)
- Recent activity feed

### Live Monitor (`/monitor`)
- Video feed panel with MJPEG stream
- Source input (webcam `0` or file path / URL)
- Vertical selector dropdown
- Start / Stop controls
- Live overlay: LIVE badge, FPS, latency
- Side panel: quick stats, vertical-specific metrics, recent alerts

### Analytics (`/analytics`)
- **Charts tab:** Detections over time, FPS & Latency (dual-axis), Severity doughnut, Alerts by vertical bar, Detection classes horizontal bar
- **Events Log tab:** Searchable table with timestamp, class, confidence, vertical, details

### Alerts (`/alerts`)
- Filter by severity (Critical / High / Medium) and vertical
- Timeline view with colored severity icons and connector lines
- Alert type badges and timestamps

### Settings (`/settings`)
- Demo Mode toggle (simulated data without backend)
- Backend URL with connection test button
- Active vertical selector
- System info (stack, version, repo link)

---

## 🎯 Verticals

| Vertical | Detects | Key Alerts | Metrics |
|----------|---------|------------|---------|
| 🦺 **Safety** | People, PPE (helmets, vests) | PPE violations, fall detection, zone intrusion | Compliance rate, persons detected |
| 🚗 **Traffic** | Vehicles (cars, trucks, buses) | Speed violations, line crossings | Vehicle counts, avg speed |
| 🏭 **Manufacturing** | Products, defects | Defective items, low pass rate | Pass rate, defect count, inspected total |
| 🍽️ **Restaurant** | People, tables | Overcrowding, long dwell times | Occupancy, table status, avg dwell |

---

## 🎬 Getting Demo Videos

### Option 1: Pexels (Free, No Login)
- **Safety:** https://www.pexels.com/search/videos/construction%20worker/
- **Traffic:** https://www.pexels.com/search/videos/traffic/
- **Manufacturing:** https://www.pexels.com/search/videos/factory/
- **Restaurant:** https://www.pexels.com/search/videos/restaurant/

Save to `demo/` folder (e.g., `demo/safety_sample.mp4`).

### Option 2: Webcam
Use `0` as video source in the Live Monitor page.

---

## 📝 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/feed/start` | Start video feed (body: `{source, vertical}`) |
| `POST` | `/api/feed/stop` | Stop video feed |
| `GET` | `/stream` | MJPEG video stream |
| `GET` | `/api/stats` | Current statistics |
| `GET` | `/api/events?limit=50` | Event history |
| `GET` | `/api/metrics/history?minutes=30` | Metrics time series |
| `GET` | `/api/alerts/recent?limit=20` | Recent alerts |
| `GET` | `/api/db/stats` | Database statistics |
| `GET` | `/api/verticals` | Available verticals |
| `POST` | `/api/zones/set` | Set detection zones |
| `WS` | `/ws/stats` | Real-time stats WebSocket |
| `WS` | `/ws/alerts` | Real-time alerts WebSocket |

Full Swagger docs at **http://localhost:8000/docs** when backend is running.

---

## 🔧 Configuration

Edit `config.json`:

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
  },
  "camera": { "width": 640, "height": 480, "fps": 30 },
  "server": { "host": "0.0.0.0", "port": 8000 }
}
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Check Python path; verify packages with `pip list`; kill port 8000 if in use |
| Frontend won't start | Run `npm install` in `frontend/`; check Node.js version |
| Video stream not showing | Ensure backend is running; check video source path; try webcam `0` first |
| WebSocket connection fails | Refresh page; check backend logs; verify CORS settings |
| Low FPS | YOLOv8n is used (fastest); reduce resolution in `config.json`; close other apps |

---

## 🎓 Next Steps

1. **Better Models:** Use `yolov8m.pt` or domain-specific models from HuggingFace
2. **Custom Models:** Place `.pt` files in `backend/models/`, update `config.json`
3. **Customize Alerts:** Adjust thresholds and cooldown times in `config.json`
4. **Deploy:** Update CORS origins, use gunicorn/nginx in production

---

## 📚 Resources

- [Ultralytics YOLOv8](https://docs.ultralytics.com/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [Supervision](https://supervision.roboflow.com/)
- [Next.js](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Recharts](https://recharts.org/)
- [Free Videos (Pexels)](https://www.pexels.com/videos/)

---

## ⚡ Quick Commands

```powershell
# Start backend
cd backend
C:\Users\aggar\AppData\Local\Programs\Python\Python312\python.exe main.py

# Start frontend (separate terminal)
cd frontend
npm run dev

# Build frontend for production
cd frontend
npm run build
npm start
```

---

**Repository:** https://github.com/hsuyaax/vision_os