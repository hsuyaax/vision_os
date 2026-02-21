/**
 * Demo data generator for VisionSync
 * Produces simulated real-time metrics when no backend is connected
 */

const VERTICALS = ["safety", "traffic", "manufacturing", "restaurant"] as const;

const VERTICAL_META: Record<string, { icon: string; label: string; description: string; color: string }> = {
  safety: { icon: "ShieldCheck", label: "Workplace Safety", description: "PPE compliance, fall detection, zone intrusion", color: "hsl(142, 76%, 36%)" },
  traffic: { icon: "Car", label: "Traffic Analytics", description: "Vehicle counting, speed estimation, violations", color: "hsl(221, 83%, 53%)" },
  manufacturing: { icon: "Factory", label: "Manufacturing QA", description: "Defect detection, pass rate, inspection", color: "hsl(262, 83%, 58%)" },
  restaurant: { icon: "UtensilsCrossed", label: "Restaurant Ops", description: "Occupancy, dwell time, table management", color: "hsl(25, 95%, 53%)" },
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function generateDemoStats(vertical: string = "safety") {
  const base = {
    fps: randFloat(24, 32),
    latency_ms: randFloat(18, 65),
    total_detections: rand(5, 40),
    active_tracks: rand(2, 15),
    uptime_seconds: rand(100, 86400),
    model: "yolov8n.pt",
    vertical,
  };

  const verticalMetrics: Record<string, object> = {
    safety: {
      persons_detected: rand(3, 12),
      ppe_compliant: rand(1, 10),
      ppe_violations: rand(0, 4),
      compliance_rate: randFloat(70, 100),
      fall_detected: Math.random() > 0.9,
      zone_intrusions: rand(0, 2),
    },
    traffic: {
      vehicles_counted: rand(10, 80),
      current_in_frame: rand(2, 20),
      avg_speed_kmh: randFloat(20, 80),
      speed_violations: rand(0, 5),
      line_crossings: rand(5, 50),
    },
    manufacturing: {
      total_inspected: rand(50, 500),
      defects_found: rand(0, 15),
      pass_rate: randFloat(85, 99.5),
      current_products: rand(1, 8),
    },
    restaurant: {
      total_occupancy: rand(10, 60),
      max_capacity: 80,
      tables_occupied: rand(3, 15),
      total_tables: 20,
      avg_dwell_minutes: randFloat(15, 65),
    },
  };

  return { ...base, metrics: verticalMetrics[vertical] || {} };
}

export function generateDemoAlert(vertical: string = "safety") {
  const alerts: Record<string, Array<{ type: string; message: string; severity: string }>> = {
    safety: [
      { type: "ppe_violation", message: "Worker without helmet detected in Zone A", severity: "high" },
      { type: "fall_detected", message: "Potential fall detected near conveyor belt", severity: "critical" },
      { type: "zone_intrusion", message: "Unauthorized person in restricted area", severity: "medium" },
    ],
    traffic: [
      { type: "speed_violation", message: "Vehicle exceeding 60 km/h on Main St", severity: "high" },
      { type: "congestion", message: "Traffic congestion building at intersection", severity: "medium" },
      { type: "wrong_way", message: "Wrong-way vehicle detected", severity: "critical" },
    ],
    manufacturing: [
      { type: "defect_detected", message: "Surface defect found on product #4821", severity: "high" },
      { type: "low_pass_rate", message: "Pass rate dropped below 90% threshold", severity: "medium" },
      { type: "line_stopped", message: "Assembly line stopped - multiple defects", severity: "critical" },
    ],
    restaurant: [
      { type: "overcrowding", message: "Occupancy at 95% capacity", severity: "high" },
      { type: "long_wait", message: "Table 7 dwell time exceeds 90 minutes", severity: "medium" },
      { type: "capacity_alert", message: "Maximum capacity reached", severity: "critical" },
    ],
  };

  const pool = alerts[vertical] || alerts.safety;
  const alert = pool[rand(0, pool.length - 1)];

  return {
    ...alert,
    vertical,
    timestamp: new Date().toISOString(),
    id: crypto.randomUUID(),
  };
}

export function generateDemoEvents(count = 20) {
  const classes = ["person", "car", "truck", "helmet", "vest", "forklift", "plate", "defect"];
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    timestamp: new Date(Date.now() - rand(0, 3600000)).toISOString(),
    class: classes[rand(0, classes.length - 1)],
    confidence: randFloat(0.6, 0.99),
    vertical: VERTICALS[rand(0, 3)],
    details: "Demo detection event",
  }));
}

export function generateDemoChartData(points = 20) {
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(Date.now() - (points - i) * 60000);
    return {
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      detections: rand(5, 45),
      fps: randFloat(20, 32),
      latency: randFloat(15, 70),
      alerts: rand(0, 3),
    };
  });
}

export { VERTICALS, VERTICAL_META };
