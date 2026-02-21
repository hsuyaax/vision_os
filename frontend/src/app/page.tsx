"use client";

import { useVS } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Eye,
  Zap,
  Clock,
  ShieldCheck,
  Car,
  Factory,
  UtensilsCrossed,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const VERTICAL_ICONS: Record<string, React.ElementType> = {
  safety: ShieldCheck,
  traffic: Car,
  manufacturing: Factory,
  restaurant: UtensilsCrossed,
};

const VERTICAL_COLORS: Record<string, string> = {
  safety: "text-green-500",
  traffic: "text-blue-500",
  manufacturing: "text-purple-500",
  restaurant: "text-orange-500",
};

const VERTICAL_META: Record<string, { label: string; desc: string }> = {
  safety: { label: "Workplace Safety", desc: "PPE compliance & fall detection" },
  traffic: { label: "Traffic Analytics", desc: "Vehicle counting & speed monitoring" },
  manufacturing: { label: "Manufacturing QA", desc: "Defect detection & inspection" },
  restaurant: { label: "Restaurant Ops", desc: "Occupancy & table management" },
};

export default function OverviewPage() {
  const { stats, alerts, chartData, vertical, setVertical, connected, demoMode } = useVS();

  const s = stats as Record<string, unknown>;
  const fps = Number(s.fps || 0);
  const latency = Number(s.latency_ms || 0);
  const detections = Number(s.total_detections || 0);
  const uptime = Number(s.uptime_seconds || 0);

  const critAlerts = alerts.filter((a) => a.severity === "critical").length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">Real-time AI surveillance overview</p>
        </div>
        <div className="flex items-center gap-2">
          {demoMode && <Badge variant="secondary">Demo Mode</Badge>}
          <Badge variant={connected ? "default" : "destructive"} className="gap-1">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-green-400" : "bg-red-400"}`} />
            {connected ? "Online" : "Offline"}
          </Badge>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Eye} label="Detections" value={detections} sub="objects in frame" />
        <StatCard icon={Zap} label="FPS" value={fps.toFixed(1)} sub="frames/second" />
        <StatCard icon={Clock} label="Latency" value={`${latency.toFixed(0)}ms`} sub="inference time" />
        <StatCard icon={Activity} label="Uptime" value={formatUptime(uptime)} sub="system uptime" />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detection Trend</CardTitle>
            <CardDescription>Real-time detections over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorDet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="detections" stroke="hsl(221, 83%, 53%)" fill="url(#colorDet)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alert Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alert Summary</CardTitle>
            <CardDescription>Active alerts by severity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Critical</span>
              </div>
              <Badge variant="destructive">{critAlerts}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm">High</span>
              </div>
              <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/20">{highAlerts}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Medium/Low</span>
              </div>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20">
                {Math.max(0, alerts.length - critAlerts - highAlerts)}
              </Badge>
            </div>
            <Link href="/alerts">
              <Button variant="outline" size="sm" className="w-full mt-2 gap-1">
                View All Alerts <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Verticals */}
      <div>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Verticals
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(VERTICAL_META).map(([key, meta]) => {
            const Icon = VERTICAL_ICONS[key];
            const active = vertical === key;
            return (
              <Card
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${active ? "ring-2 ring-primary" : ""}`}
                onClick={() => setVertical(key)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg bg-muted ${VERTICAL_COLORS[key]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {active && <Badge>Active</Badge>}
                  </div>
                  <h3 className="font-medium mt-3">{meta.label}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{meta.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest alerts and detections</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start gap-3 text-sm">
                <div className={`h-2 w-2 rounded-full mt-1.5 ${alert.severity === "critical" ? "bg-red-500" : alert.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString()} — {alert.vertical}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{alert.severity}</Badge>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}