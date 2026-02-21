"use client";

import { useState } from "react";
import { useVS } from "@/components/providers";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Trash2,
} from "lucide-react";

type SeverityFilter = "all" | "critical" | "high" | "medium";

export default function AlertsPage() {
  const { alerts } = useVS();
  const [filter, setFilter] = useState<SeverityFilter>("all");
  const [verticalFilter, setVerticalFilter] = useState("all");

  const filtered = alerts.filter((a) => {
    if (filter !== "all" && a.severity !== filter) return false;
    if (verticalFilter !== "all" && a.vertical !== verticalFilter) return false;
    return true;
  });

  const critCount = alerts.filter((a) => a.severity === "critical").length;
  const highCount = alerts.filter((a) => a.severity === "high").length;
  const medCount = alerts.filter((a) => a.severity === "medium").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-muted-foreground text-sm">Real-time alert timeline with filtering</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="gap-1">{critCount} Critical</Badge>
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">{highCount} High</Badge>
          <Badge variant="secondary">{medCount} Medium</Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Severity</label>
              <Select value={filter} onValueChange={(v) => setFilter(v as SeverityFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vertical</label>
              <Select value={verticalFilter} onValueChange={setVerticalFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Verticals</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="traffic">Traffic</SelectItem>
                  <SelectItem value="manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="restaurant">Restaurant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Badge variant="outline" className="h-9 px-3 gap-1">
                <Filter className="h-3 w-3" />
                {filtered.length} result{filtered.length !== 1 ? "s" : ""}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alert Timeline</CardTitle>
          <CardDescription>Sorted by most recent</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-1">
              {filtered.map((alert, idx) => (
                <div key={alert.id}>
                  <div className="flex gap-4 py-3">
                    {/* Severity Icon */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          alert.severity === "critical"
                            ? "bg-red-500/10 text-red-500"
                            : alert.severity === "high"
                            ? "bg-orange-500/10 text-orange-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {alert.severity === "critical" ? (
                          <XCircle className="h-4 w-4" />
                        ) : alert.severity === "high" ? (
                          <AlertTriangle className="h-4 w-4" />
                        ) : (
                          <Bell className="h-4 w-4" />
                        )}
                      </div>
                      {idx < filtered.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {alert.type.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {alert.vertical}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  {idx < filtered.length - 1 && <Separator className="ml-12" />}
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-3" />
                  <p className="text-sm font-medium">No alerts matching filters</p>
                  <p className="text-xs text-muted-foreground mt-1">Try adjusting your filter criteria</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
