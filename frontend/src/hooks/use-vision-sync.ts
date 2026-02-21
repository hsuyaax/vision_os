"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/lib/api";
import {
  generateDemoStats,
  generateDemoAlert,
  generateDemoEvents,
  generateDemoChartData,
} from "@/lib/demo-data";

export type Alert = {
  id: string;
  type: string;
  message: string;
  severity: string;
  vertical: string;
  timestamp: string;
};

export type Stats = Record<string, unknown>;

export function useVisionSync() {
  const [connected, setConnected] = useState(false);
  const [demoMode, setDemoMode] = useState(true);
  const [vertical, setVertical] = useState("safety");
  const [feeding, setFeeding] = useState(false);
  const [stats, setStats] = useState<Stats>({});
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState(generateDemoChartData());

  const wsStats = useRef<WebSocket | null>(null);
  const wsAlerts = useRef<WebSocket | null>(null);
  const demoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check backend connectivity
  const checkConnection = useCallback(async () => {
    try {
      await api.health();
      setConnected(true);
      return true;
    } catch {
      setConnected(false);
      return false;
    }
  }, []);

  // Connect WebSockets
  const connectWs = useCallback(() => {
    if (demoMode) return;

    // Stats WS
    try {
      wsStats.current = new WebSocket(api.wsStatsUrl);
      wsStats.current.onmessage = (e) => {
        const data = JSON.parse(e.data);
        setStats(data.metrics || data);
      };
      wsStats.current.onclose = () => {
        setTimeout(connectWs, 3000);
      };
    } catch {
      /* ignore */
    }

    // Alerts WS
    try {
      wsAlerts.current = new WebSocket(api.wsAlertsUrl);
      wsAlerts.current.onmessage = (e) => {
        const alert = JSON.parse(e.data);
        setAlerts((prev) => [{ ...alert, id: crypto.randomUUID() }, ...prev].slice(0, 100));
      };
    } catch {
      /* ignore */
    }
  }, [demoMode]);

  // Demo mode ticker
  useEffect(() => {
    if (demoMode) {
      // Close real WS
      wsStats.current?.close();
      wsAlerts.current?.close();

      demoInterval.current = setInterval(() => {
        setStats(generateDemoStats(vertical));
        if (Math.random() > 0.7) {
          setAlerts((prev) =>
            [generateDemoAlert(vertical), ...prev].slice(0, 100)
          );
        }
        setChartData((prev) => {
          const next = [...prev.slice(1)];
          const time = new Date();
          next.push({
            time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            detections: Math.floor(Math.random() * 40) + 5,
            fps: parseFloat((Math.random() * 12 + 20).toFixed(1)),
            latency: parseFloat((Math.random() * 55 + 15).toFixed(1)),
            alerts: Math.floor(Math.random() * 3),
          });
          return next;
        });
      }, 2000);

      setStats(generateDemoStats(vertical));
      setEvents(generateDemoEvents());

      return () => {
        if (demoInterval.current) clearInterval(demoInterval.current);
      };
    } else {
      if (demoInterval.current) clearInterval(demoInterval.current);
      connectWs();
    }
  }, [demoMode, vertical, connectWs]);

  // Startup connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Start feed
  const startFeed = useCallback(
    async (source: string) => {
      if (demoMode) {
        setFeeding(true);
        return { status: "ok (demo)" };
      }
      const res = await api.startFeed(source, vertical);
      if (res.status === "started") setFeeding(true);
      return res;
    },
    [demoMode, vertical]
  );

  // Stop feed
  const stopFeed = useCallback(async () => {
    if (demoMode) {
      setFeeding(false);
      return { status: "ok (demo)" };
    }
    const res = await api.stopFeed();
    if (res.status === "stopped") setFeeding(false);
    return res;
  }, [demoMode]);

  return {
    connected,
    demoMode,
    setDemoMode,
    vertical,
    setVertical,
    feeding,
    stats,
    alerts,
    events,
    chartData,
    startFeed,
    stopFeed,
    checkConnection,
  };
}
