"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useVS } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Video,
  BarChart3,
  Bell,
  Settings,
  Eye,
  Wifi,
  WifiOff,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/monitor", label: "Live Monitor", icon: Video },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { connected, demoMode, alerts } = useVS();
  const unreadAlerts = alerts.filter((a) => a.severity === "critical").length;

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <Eye className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-semibold text-lg leading-none">VisionSync</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">AI Surveillance OS</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.label === "Alerts" && unreadAlerts > 0 && (
                <Badge variant="destructive" className="ml-auto text-[10px] h-5 min-w-5 flex items-center justify-center">
                  {unreadAlerts}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="px-4 py-4 border-t space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {connected ? (
            <Wifi className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <WifiOff className="h-3.5 w-3.5 text-red-500" />
          )}
          {connected ? "Backend Connected" : "Backend Offline"}
        </div>
        {demoMode && (
          <Badge variant="secondary" className="text-[10px]">
            Demo Mode
          </Badge>
        )}
      </div>
    </aside>
  );
}
