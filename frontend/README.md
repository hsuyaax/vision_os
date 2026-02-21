# VisionSync Frontend

The web dashboard for VisionSync — providing real-time monitoring, analytics, and alert management for AI-powered surveillance.

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI components |
| **TypeScript** | Type safety |
| **Tailwind CSS v4** | Styling |
| **shadcn/ui** | Component library |
| **Recharts** | Data visualization |

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the app starts in **Demo Mode** by default.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                  # Next.js App Router pages
│   ├── page.tsx          # Dashboard (home)
│   ├── monitor/          # Live camera feed monitoring
│   ├── analytics/        # Charts & event logs
│   ├── alerts/           # Alert timeline
│   └── settings/         # Configuration
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── app-shell.tsx     # Main layout wrapper
│   └── sidebar.tsx       # Navigation sidebar
├── hooks/
│   └── use-vision-sync.ts # WebSocket & state management
└── lib/
    ├── api.ts            # Backend API client
    ├── demo-data.ts      # Demo mode data generation
    └── utils.ts          # Utility functions
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with real-time stats, detection trends, and activity feed |
| `/monitor` | Live video feed with MJPEG streaming and detection overlays |
| `/analytics` | Charts (trends, FPS, severity) and searchable events log |
| `/alerts` | Filterable alert timeline with severity badges |
| `/settings` | Backend connection, vertical selection, demo mode toggle |

## Demo Mode

The app runs in demo mode when enabled in Settings, simulating:
- Live detection statistics
- Animated canvas feed
- Real-time alert generation
- Historical analytics data

No backend connection required to explore the full UI.

## Connecting to Backend

1. Start the backend: `cd backend && python main.py`
2. Open Settings → Disable Demo Mode
3. Test Connection → should show "Connected"
4. Navigate to Monitor → Start camera feed

Backend API: `http://localhost:8000`  
WebSocket: `ws://localhost:8000/ws`
