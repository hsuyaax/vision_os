"use client";

import { useVS } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Gauge,
  Timer,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = ["hsl(221, 83%, 53%)", "hsl(142, 76%, 36%)", "hsl(262, 83%, 58%)", "hsl(25, 95%, 53%)", "hsl(0, 84%, 60%)"];

export default function AnalyticsPage() {
  const { chartData, events, alerts, stats, vertical } = useVS();

  const s = stats as Record<string, unknown>;
  const fps = Number(s.fps || 0);
  const latency = Number(s.latency_ms || 0);
  const totalDet = Number(s.total_detections || 0);

  // Severity distribution
  const severityData = [
    { name: "Critical", value: alerts.filter((a) => a.severity === "critical").length, fill: "hsl(0, 84%, 60%)" },
    { name: "High", value: alerts.filter((a) => a.severity === "high").length, fill: "hsl(25, 95%, 53%)" },
    { name: "Medium", value: alerts.filter((a) => a.severity === "medium").length, fill: "hsl(48, 96%, 53%)" },
  ];

  // Vertical distribution from alerts
  const verticalDist = ["safety", "traffic", "manufacturing", "restaurant"].map((v, i) => ({
    name: v.charAt(0).toUpperCase() + v.slice(1),
    count: alerts.filter((a) => a.vertical === v).length,
    fill: COLORS[i],
  }));

  // Class distribution from events
  const classCounts: Record<string, number> = {};
  events.forEach((e) => {
    const cls = String(e.class || "unknown");
    classCounts[cls] = (classCounts[cls] || 0) + 1;
  });
  const classData = Object.entries(classCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count], i) => ({ name, count, fill: COLORS[i % COLORS.length] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">Historical charts and event data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MiniStat icon={BarChart3} label="Total Events" value={events.length} />
        <MiniStat icon={TrendingUp} label="Total Alerts" value={alerts.length} />
        <MiniStat icon={Gauge} label="Avg FPS" value={fps.toFixed(1)} />
        <MiniStat icon={Timer} label="Avg Latency" value={`${latency.toFixed(0)}ms`} />
      </div>

      <Tabs defaultValue="charts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="events">Events Log</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          {/* Detection + FPS Trend */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detections Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="gDet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="detections" stroke={COLORS[0]} fill="url(#gDet)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">FPS & Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="fps" stroke={COLORS[1]} dot={false} strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="latency" stroke={COLORS[3]} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Severity Doughnut + Vertical Bar + Class Bar */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Severity Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={severityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {severityData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alerts by Vertical</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={verticalDist}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {verticalDist.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detection Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={70} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {classData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Events Log</CardTitle>
              <CardDescription>{events.length} events recorded</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.slice(0, 50).map((ev, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="text-xs">
                          {new Date(String(ev.timestamp)).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{String(ev.class)}</Badge>
                        </TableCell>
                        <TableCell>{Number(ev.confidence || 0).toFixed(2)}</TableCell>
                        <TableCell className="capitalize">{String(ev.vertical)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {String(ev.details || "")}
                        </TableCell>
                      </TableRow>
                    ))}
                    {events.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No events recorded yet
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};
