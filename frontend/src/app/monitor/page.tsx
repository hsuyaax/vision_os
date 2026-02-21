"use client";

import { useState } from "react";
import { useVS } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Square,
  Video,
  Camera,
  Eye,
  Zap,
  Clock,
  Target,
  ShieldCheck,
  Car,
  Factory,
  UtensilsCrossed,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

const VERTICALS = [
  { value: "safety", label: "Workplace Safety", icon: ShieldCheck },
  { value: "traffic", label: "Traffic Analytics", icon: Car },
  { value: "manufacturing", label: "Manufacturing QA", icon: Factory },
  { value: "restaurant", label: "Restaurant Ops", icon: UtensilsCrossed },
];

export default function MonitorPage() {
  const { stats, vertical, setVertical, feeding, startFeed, stopFeed, demoMode, alerts } = useVS();
  const [source, setSource] = useState("0");
  const [loading, setLoading] = useState(false);

  const s = stats as Record<string, unknown>;
  const metrics = (s.metrics || {}) as Record<string, unknown>;
  const fps = Number(s.fps || 0);
  const latency = Number(s.latency_ms || 0);
  const detections = Number(s.total_detections || 0);
  const activeTracks = Number(s.active_tracks || 0);

  const handleStart = async () => {
    setLoading(true);
    try {
      const res = await startFeed(source);
      toast.success("Feed started", { description: `Vertical: ${vertical}, Source: ${source}` });
    } catch {
      toast.error("Failed to start feed");
    }
    setLoading(false);
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await stopFeed();
      toast.info("Feed stopped");
    } catch {
      toast.error("Failed to stop feed");
    }
    setLoading(false);
  };

  // Build vertical-specific metrics display
  const verticalMetrics = Object.entries(metrics).map(([key, val]) => ({
    label: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    value: typeof val === "boolean" ? (val ? "Yes" : "No") : typeof val === "number" ? (Number.isInteger(val) ? val : (val as number).toFixed(2)) : String(val),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Live Monitor</h1>
        <p className="text-muted-foreground text-sm">Real-time video feed with AI inference</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video Panel - 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Video Source</label>
                  <Input
                    placeholder="Camera index (0) or video path/URL"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    disabled={feeding}
                  />
                </div>
                <div className="w-full sm:w-48">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vertical</label>
                  <Select value={vertical} onValueChange={setVertical} disabled={feeding}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VERTICALS.map((v) => (
                        <SelectItem key={v.value} value={v.value}>
                          <div className="flex items-center gap-2">
                            <v.icon className="h-3.5 w-3.5" />
                            {v.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  {!feeding ? (
                    <Button onClick={handleStart} disabled={loading} className="gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Start
                    </Button>
                  ) : (
                    <Button onClick={handleStop} disabled={loading} variant="destructive" className="gap-2">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                      Stop
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Video Feed */}
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {feeding && !demoMode ? (
                <img
                  src={api.streamUrl}
                  alt="Live Feed"
                  className="w-full h-full object-contain"
                />
              ) : feeding && demoMode ? (
                <div className="text-center text-white">
                  <Video className="h-16 w-16 mx-auto mb-3 opacity-50 animate-pulse" />
                  <p className="text-lg font-medium">Demo Mode Active</p>
                  <p className="text-sm text-white/60">Simulated data is being generated</p>
                </div>
              ) : (
                <div className="text-center text-white/40">
                  <Camera className="h-16 w-16 mx-auto mb-3" />
                  <p className="text-sm">No active feed</p>
                  <p className="text-xs mt-1">Configure source and click Start</p>
                </div>
              )}
              {/* Status overlay */}
              {feeding && (
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1 animate-pulse">
                    <span className="h-2 w-2 rounded-full bg-white" />
                    LIVE
                  </Badge>
                  <Badge variant="secondary" className="bg-black/50 text-white border-none">
                    {vertical.toUpperCase()}
                  </Badge>
                </div>
              )}
              {feeding && (
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <Badge variant="secondary" className="bg-black/50 text-white border-none text-xs">
                    {fps.toFixed(1)} FPS
                  </Badge>
                  <Badge variant="secondary" className="bg-black/50 text-white border-none text-xs">
                    {latency.toFixed(0)}ms
                  </Badge>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Side Panel - 1 col */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <MetricRow icon={Eye} label="Detections" value={detections} />
              <MetricRow icon={Target} label="Active Tracks" value={activeTracks} />
              <MetricRow icon={Zap} label="FPS" value={fps.toFixed(1)} />
              <MetricRow icon={Clock} label="Latency" value={`${latency.toFixed(0)}ms`} />
            </CardContent>
          </Card>

          {/* Vertical Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">{vertical} Metrics</CardTitle>
              <CardDescription>Vertical-specific analytics</CardDescription>
            </CardHeader>
            <CardContent>
              {verticalMetrics.length > 0 ? (
                <div className="space-y-2.5">
                  {verticalMetrics.map((m) => (
                    <div key={m.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-medium">{m.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Start a feed to see metrics
                </p>
              )}
            </CardContent>
          </Card>

          {/* Detection Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recent Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {alerts.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === "critical" ? "bg-red-500" : a.severity === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                    <div className="min-w-0">
                      <p className="truncate">{a.message}</p>
                      <p className="text-muted-foreground">
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">No alerts yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
