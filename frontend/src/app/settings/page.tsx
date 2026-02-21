"use client";

import { useState } from "react";
import { useVS } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings as SettingsIcon,
  Server,
  Wifi,
  WifiOff,
  MonitorPlay,
  Palette,
  Bell,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function SettingsPage() {
  const { demoMode, setDemoMode, connected, checkConnection, vertical, setVertical } = useVS();
  const [serverUrl, setServerUrl] = useState(api.base);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "fail" | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await checkConnection();
      setTestResult(ok ? "success" : "fail");
      if (ok) {
        toast.success("Backend is reachable");
      } else {
        toast.error("Cannot reach backend");
      }
    } catch {
      setTestResult("fail");
      toast.error("Connection failed");
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">Configure VisionSync preferences</p>
      </div>

      {/* Demo Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MonitorPlay className="h-4 w-4" />
            Demo Mode
          </CardTitle>
          <CardDescription>
            Generate simulated data without a backend connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Demo Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {demoMode
                  ? "Using simulated data — no backend required"
                  : "Connected to live backend"}
              </p>
            </div>
            <Switch checked={demoMode} onCheckedChange={setDemoMode} />
          </div>
        </CardContent>
      </Card>

      {/* Server Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="h-4 w-4" />
            Backend Connection
          </CardTitle>
          <CardDescription>Configure the FastAPI server URL</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {connected ? (
              <Badge className="gap-1 bg-green-500/10 text-green-500 border-green-500/20">
                <Wifi className="h-3 w-3" /> Connected
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="h-3 w-3" /> Disconnected
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8000"
            />
            <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2 shrink-0">
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testResult === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : testResult === "fail" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Default: http://localhost:8000. Set NEXT_PUBLIC_API_URL env var to change.
          </p>
        </CardContent>
      </Card>

      {/* Active Vertical */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Active Vertical
          </CardTitle>
          <CardDescription>Select the AI processing vertical</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={vertical} onValueChange={setVertical}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="safety">Workplace Safety</SelectItem>
              <SelectItem value="traffic">Traffic Analytics</SelectItem>
              <SelectItem value="manufacturing">Manufacturing QA</SelectItem>
              <SelectItem value="restaurant">Restaurant Ops</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            System Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <InfoRow label="Frontend" value="Next.js + shadcn/ui" />
            <InfoRow label="Backend" value="FastAPI + Uvicorn" />
            <InfoRow label="AI Model" value="YOLOv8n (Ultralytics)" />
            <InfoRow label="Tracking" value="Supervision (ByteTrack)" />
            <InfoRow label="Database" value="SQLite (events.db)" />
            <Separator className="my-3" />
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Repository" value="github.com/hsuyaax/vision_os" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
