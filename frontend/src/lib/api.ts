/**
 * VisionSync API client
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = {
  base: API_BASE,

  async health() {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.json();
  },

  async startFeed(source: string, vertical: string) {
    const res = await fetch(`${API_BASE}/api/feed/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, vertical }),
    });
    return res.json();
  },

  async stopFeed() {
    const res = await fetch(`${API_BASE}/api/feed/stop`, { method: "POST" });
    return res.json();
  },

  async getStats() {
    const res = await fetch(`${API_BASE}/api/stats`);
    return res.json();
  },

  async getEvents(limit = 50) {
    const res = await fetch(`${API_BASE}/api/events?limit=${limit}`);
    return res.json();
  },

  async getMetricsHistory(minutes = 30) {
    const res = await fetch(`${API_BASE}/api/metrics/history?minutes=${minutes}`);
    return res.json();
  },

  async getRecentAlerts(limit = 20) {
    const res = await fetch(`${API_BASE}/api/alerts/recent?limit=${limit}`);
    return res.json();
  },

  async getDbStats() {
    const res = await fetch(`${API_BASE}/api/db/stats`);
    return res.json();
  },

  async getVerticals() {
    const res = await fetch(`${API_BASE}/api/verticals`);
    return res.json();
  },

  async setZones(zones: Array<{ id: string; name: string; points: number[][] }>) {
    const res = await fetch(`${API_BASE}/api/zones/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zones }),
    });
    return res.json();
  },

  streamUrl: `${API_BASE}/stream`,

  wsStatsUrl: `${API_BASE.replace("http", "ws")}/ws/stats`,
  wsAlertsUrl: `${API_BASE.replace("http", "ws")}/ws/alerts`,
};
