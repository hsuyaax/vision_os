<div align="center">

# VisionSync

### AI-Powered Multi-Camera Surveillance Operating System

Real-time computer vision analytics across **4 industry verticals** — built with YOLOv8, FastAPI, and Next.js.

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-FF6F00?logo=yolo&logoColor=white)](https://docs.ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Live Demo](#demo-mode) · [Quick Start](#-quick-start) · [API Docs](#-api-reference) · [Training](#-model-training)

</div>

---

## Overview

VisionSync is a modular AI surveillance platform that transforms any camera feed into actionable, industry-specific insights. It processes live video streams through YOLOv8 object detection, applies domain-specific business logic, and delivers real-time alerts, analytics, and dashboards — all through an intuitive web interface.

### Key Highlights

- **4 Industry Verticals** — Workplace Safety, Traffic Analytics, Manufacturing QA, Restaurant Operations
- **Real-Time Processing** — Live MJPEG streaming with sub-second inference latency
- **WebSocket-Powered** — Instant stats and alert delivery to the frontend
- **Demo Mode** — Full UI experience with simulated data, no backend or camera required
- **Configurable Alerts** — Cooldown deduplication, severity levels, and per-vertical thresholds
- **Training Pipeline** — Fine-tune YOLOv8 on custom datasets via Roboflow or Open Images

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 16)                    │
│  React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts│
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │Dashboard │ │ Monitor  │ │Analytics │ │  Alerts  │ │Settings│ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │
│       └─────────────┴────────────┴─────────────┴───────────┘     │
│                     WebSocket + REST API                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────┴──────────────────────────────────┐
│                       Backend (FastAPI)                          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ Camera       │  │ Inference    │  │   Vertical Processors  │ │
│  │ Manager      │─▶│ Engine       │─▶│  Safety · Traffic      │ │
│  │ (OpenCV)     │  │ (YOLOv8)     │  │  Manufacturing · Rest. │ │
│  └──────────────┘  └──────────────┘  └───────────┬────────────┘ │
│                                                   │              │
│  ┌──────────────┐  ┌──────────────┐               │              │
│  │ Alert        │◀─┤ Database     │◀──────────────┘              │
│  │ Manager      │  │ (SQLite)     │                              │
│  └──────────────┘  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts |
| **Backend** | FastAPI, Uvicorn, Python 3.12+ |
| **AI / CV** | YOLOv8 (Ultralytics), Supervision, OpenCV |
| **Database** | SQLite (events + time-series analytics) |
| **Real-time** | WebSockets (stats @ 1Hz, alerts on event) |
| **Training** | Roboflow datasets, Ultralytics training API |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | 3.12+ |
| Node.js | 18+ |
| npm | 9+ |

### 1. Clone the repository

```bash
git clone https://github.com/hsuyaax/vision_os.git
cd vision_os
```

### 2. Install backend dependencies

```bash
pip install ultralytics supervision fastapi uvicorn opencv-python websockets python-multipart huggingface_hub
```

### 3. Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Start the system

**Terminal 1 — Backend:**
```bash
cd backend
python main.py
```
> Backend runs at **http://localhost:8000** — Swagger docs at **http://localhost:8000/docs**

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```
> Frontend runs at **http://localhost:3000**

### 5. Open the app

Navigate to **http://localhost:3000**. The app starts in **Demo Mode** by default — no backend needed to explore the UI.

To use live camera feeds: **Settings** → Disable Demo Mode → Test Connection → **Monitor** → Enter source → Start.

---

## 📺 Pages

### Dashboard `/`
Real-time overview with stat cards (detections, FPS, latency, uptime), a detection trend area chart, alert severity summary, vertical selector, and recent activity feed.

### Monitor `/monitor`
Live video feed panel with MJPEG streaming (or animated canvas in demo mode). Includes source input (webcam index `0` or file path), vertical selector, start/stop controls, live overlay badges, vertical-specific metrics, and a recent alerts timeline.

### Analytics `/analytics`
Two tabs: **Charts** (detection trends, FPS/latency, severity distribution, alerts by vertical, detection class breakdown) and **Events Log** (searchable, sortable data table with timestamp, class, confidence, and details).

### Alerts `/alerts`
Filterable alert timeline with severity badges (Critical / High / Medium), vertical filters, color-coded severity icons, and type/timestamp details.

### Settings `/settings`
Demo mode toggle, backend URL configuration with connection test, active vertical selector, and system information panel.

---

## 🎯 Industry Verticals

### 🦺 Workplace Safety
| Capability | Description |
|-----------|-------------|
| PPE Compliance | Detects helmets, vests, and gloves — checks spatial overlap with person bounding boxes |
| Fall Detection | Flags persons with aspect ratio > 1.3 (horizontal posture) |
| Zone Intrusion | Ray-casting point-in-polygon test for restricted area monitoring |

**Alerts:** `PPE_VIOLATION` (High), `FALL_DETECTED` (High, 5s cooldown), `ZONE_INTRUSION` (Medium)

### 🚗 Traffic Analytics
| Capability | Description |
|-----------|-------------|
| Vehicle Counting | Classifies cars, trucks, buses, motorcycles, bicycles per frame |
| Line Crossing | Detects vehicles crossing configurable counting lines |
| Speed Estimation | Estimates speed from tracking history, flags speed limit violations |

**Alerts:** `SPEED_VIOLATION` (High), `LINE_CROSSING` (Medium)

### 🏭 Manufacturing QA
| Capability | Description |
|-----------|-------------|
| Product Inspection | Separates product detections from defect detections |
| Defect Classification | Categorizes scratches, dents, cracks, and other defects |
| Quality Pass Rate | Tracks cumulative pass/fail ratio in real time |

**Alerts:** `DEFECT_DETECTED` (High), `HIGH_DEFECT_RATE` (Critical)

### 🍽️ Restaurant Operations
| Capability | Description |
|-----------|-------------|
| Occupancy Monitoring | Counts people against configurable max capacity |
| Table Management | Determines table occupancy by person-to-table proximity |
| Dwell Time Tracking | Tracks stay duration, alerts on long stays (default 30 min) |

**Alerts:** `CAPACITY_EXCEEDED` (High), `NEAR_CAPACITY` (Medium), `LONG_STAY` (Low)

---

## 📝 API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root — API name, version, status |
| `GET` | `/api/health` | Health check — camera, vertical, DB status |
| `POST` | `/api/feed/start` | Start video feed (`{ source, vertical }`) |
| `POST` | `/api/feed/stop` | Stop active video feed |
| `GET` | `/stream` | MJPEG live video stream with overlays |
| `GET` | `/api/stats` | Current statistics and vertical metrics |
| `GET` | `/api/events` | Event history (filterable: `vertical`, `severity`, `limit`) |
| `GET` | `/api/metrics/history` | Time-series metrics (`vertical`, `metric_name`, `hours`) |
| `GET` | `/api/alerts/recent` | Recent alerts (`vertical`, `limit`) |
| `GET` | `/api/db/stats` | Database table counts and sizes |
| `GET` | `/api/verticals` | Available verticals with model info |
| `POST` | `/api/zones/set` | Define restricted polygon zones |

### WebSocket Channels

| Path | Frequency | Payload |
|------|-----------|---------|
| `ws://…/ws/stats` | Every 1s | Vertical metrics, FPS, latency, detection counts |
| `ws://…/ws/alerts` | On event | Alert type, severity, message, timestamp |

> Interactive Swagger docs available at **http://localhost:8000/docs**

---

## 📁 Project Structure

```
vision_os/
├── backend/
│   ├── main.py                 # FastAPI app — 12 REST + 2 WebSocket endpoints
│   ├── camera_manager.py       # Threaded OpenCV video capture with frame queue
│   ├── inference_engine.py     # YOLOv8 model loading, inference, MJPEG generation
│   ├── db.py                   # SQLite manager — events table + analytics table
│   ├── alert_manager.py        # Pub/sub alerts with cooldown deduplication
│   └── logic/
│       ├── safety.py           # PPE compliance, fall detection, zone intrusion
│       ├── traffic.py          # Vehicle counting, tracking, speed estimation
│       ├── manufacturing.py    # Defect detection, quality pass rate
│       └── restaurant.py       # Occupancy, table management, dwell time
├── frontend/
│   └── src/
│       ├── app/                # Next.js pages (dashboard, monitor, analytics, alerts, settings)
│       ├── components/         # App shell, sidebar, mobile nav, 17 shadcn/ui components
│       ├── hooks/              # useVisionSync — WebSocket + demo mode state management
│       └── lib/                # API client, demo data generator, utilities
├── training/
│   ├── train_model.py          # YOLOv8 fine-tuning with augmentation + auto-deploy
│   ├── download_dataset.py     # Roboflow / Open Images dataset downloader
│   └── datasets/               # Training data (YOLO format)
├── demo/                       # Place demo videos here
├── config.json                 # Global configuration (verticals, camera, server, DB)
└── README.md
```

---

## 🔧 Configuration

All settings are centralized in `config.json`:

```json
{
  "verticals": {
    "safety": {
      "model": "yolov8n.pt",
      "ppe_required": ["helmet", "vest"],
      "confidence_threshold": 0.7,
      "alert_cooldown": 15,
      "fall_detection_enabled": true
    },
    "traffic": {
      "model": "yolov8n.pt",
      "vehicle_classes": ["car", "truck", "bus", "motorcycle", "bicycle"],
      "speed_limit": 50,
      "confidence_threshold": 0.65
    },
    "manufacturing": {
      "model": "yolov8n.pt",
      "classes_of_interest": ["product", "defect", "scratch", "dent"],
      "confidence_threshold": 0.6,
      "defect_threshold": 3
    },
    "restaurant": {
      "model": "yolov8n.pt",
      "max_capacity": 50,
      "dwell_time_threshold": 1800,
      "confidence_threshold": 0.7
    }
  },
  "camera": { "default_source": 0, "fps": 30, "resolution": [640, 480] },
  "server": { "host": "0.0.0.0", "port": 8000, "cors_origins": ["*"] },
  "database": { "path": "events.db", "retention_days": 30 }
}
```

---

## 🧠 Model Training

VisionSync includes a training pipeline for fine-tuning YOLOv8 on vertical-specific datasets.

### Download datasets

```bash
cd training

# Via Roboflow (API key required)
python download_dataset.py --vertical safety --source roboflow --api-key YOUR_KEY

# Via Open Images (no API key needed)
python download_dataset.py --vertical traffic --source openimages
```

**Pre-configured datasets:**
| Vertical | Dataset | Classes |
|----------|---------|---------|
| Safety | Construction Site Safety | helmet, vest, person, head, etc. (10 classes) |
| Traffic | Vehicle Detection | car, truck, bus, motorcycle, bicycle (5 classes) |
| Manufacturing | PCB Defect Detection | missing_hole, mouse_bite, open_circuit, etc. (6 classes) |

### Train a model

```bash
python train_model.py --vertical safety --epochs 50 --batch 16 --imgsz 640
```

Training includes data augmentation (HSV, rotation, scale, flip, mosaic, mixup), auto-validation with mAP metrics, and automatic deployment of best weights to `backend/models/` with `config.json` updates.

---

## Demo Mode

VisionSync ships with a **fully functional demo mode** that requires no backend, camera, or GPU:

- Simulated stats update every 2 seconds
- Random alerts generated at 30% probability
- Animated bounding boxes on a simulated canvas (Monitor page)
- Synthetic chart data across all analytics views
- Auto-activates when the backend is unreachable

Toggle demo mode in **Settings** or let the app auto-detect.

---

## 🎬 Demo Videos

To test with real video feeds, download free footage:

| Vertical | Source |
|----------|--------|
| Safety | [Pexels — Construction Workers](https://www.pexels.com/search/videos/construction%20worker/) |
| Traffic | [Pexels — Traffic](https://www.pexels.com/search/videos/traffic/) |
| Manufacturing | [Pexels — Factory](https://www.pexels.com/search/videos/factory/) |
| Restaurant | [Pexels — Restaurant](https://www.pexels.com/search/videos/restaurant/) |

Save videos to `demo/` and use the file path as the video source in the Monitor page. Alternatively, use webcam index `0` for live capture.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Backend won't start | Verify Python 3.12+ is installed; check packages with `pip list`; kill port 8000 if in use |
| Frontend won't start | Run `npm install` in `frontend/`; verify Node.js 18+ |
| Video stream not showing | Ensure backend is running; check video source path; try webcam `0` first |
| WebSocket disconnects | Refresh the page; check backend logs; auto-reconnect triggers after 3s |
| Low FPS | Reduce resolution in `config.json`; close GPU-heavy apps; YOLOv8n is already the fastest variant |
| Model not found | Ensure `.pt` file exists in `backend/` or `backend/models/`; update path in `config.json` |

---

## Roadmap

- [ ] Multi-camera simultaneous streams
- [ ] GPU acceleration (CUDA / TensorRT)
- [ ] User authentication and role-based access
- [ ] Cloud deployment (Docker + Kubernetes)
- [ ] Custom vertical builder (no-code)
- [ ] Email / SMS / Webhook alert integrations
- [ ] Video recording and playback
- [ ] Edge deployment (Jetson Nano / Raspberry Pi)

---

## 📚 Resources

| Resource | Link |
|----------|------|
| Ultralytics YOLOv8 | [docs.ultralytics.com](https://docs.ultralytics.com/) |
| FastAPI | [fastapi.tiangolo.com](https://fastapi.tiangolo.com/) |
| Supervision | [supervision.roboflow.com](https://supervision.roboflow.com/) |
| Next.js | [nextjs.org/docs](https://nextjs.org/docs) |
| shadcn/ui | [ui.shadcn.com](https://ui.shadcn.com/) |
| Recharts | [recharts.org](https://recharts.org/) |
| Roboflow | [roboflow.com](https://roboflow.com/) |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**[VisionSync](https://github.com/hsuyaax/vision_os)** — Built with YOLOv8 + FastAPI + Next.js

</div>