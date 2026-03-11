"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardCheck,
  Utensils,
  Activity,
  TestTubes,
  Dumbbell,
  Pill,
  Moon,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  FileText,
  Bot,
  Brain,
  Leaf,
  Settings,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Logo, LogoMark } from "../logo";
import { cn } from "@/lib/utils";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardCheck,
  Utensils,
  Activity,
  TestTubes,
  Dumbbell,
  Pill,
  Moon,
  HeartPulse,
  ShieldCheck,
  TrendingUp,
  FileText,
  Bot,
  Brain,
  Leaf,
  Settings,
};

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Daily Log", href: "/daily-log", icon: "ClipboardCheck" },
  { label: "Nutrition", href: "/nutrition", icon: "Utensils" },
  { label: "Body Metrics", href: "/body-metrics", icon: "Activity" },
  { label: "Labs", href: "/labs", icon: "TestTubes" },
  { label: "Training", href: "/training", icon: "Dumbbell" },
  { label: "Supplements", href: "/supplements", icon: "Pill" },
  { label: "Sleep", href: "/sleep", icon: "Moon" },
  { label: "Vitals", href: "/vitals", icon: "HeartPulse" },
  { label: "Preventive Care", href: "/preventive-care", icon: "ShieldCheck" },
  { label: "Trends", href: "/trends", icon: "TrendingUp" },
  { label: "Reports", href: "/reports", icon: "FileText" },
  { label: "Adaptive AI", href: "/adaptive", icon: "Brain" },
  { label: "AI Coach", href: "/ai-coach", icon: "Bot" },
  { label: "Environment", href: "/environment", icon: "Leaf" },
  { label: "Settings", href: "/settings", icon: "Settings" },
] as const;

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-bg-card border-r border-border z-40 transition-all duration-300",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between px-3 border-b border-border">
          {collapsed ? (
            <div className="flex w-full justify-center">
              <LogoMark />
            </div>
          ) : (
            <Logo size="sm" />
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-150",
                  collapsed && "justify-center px-2",
                  isActive
                    ? "bg-accent-teal-dim text-accent-teal"
                    : "text-text-secondary hover:bg-bg-card-hover hover:text-text-primary"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-10 items-center justify-center border-t border-border text-text-secondary hover:text-text-primary transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border z-40 flex overflow-x-auto">
        {NAV_ITEMS.slice(0, 6).map((item) => {
          const Icon = iconMap[item.icon];
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] min-w-[60px] transition-colors",
                isActive ? "text-accent-teal" : "text-text-secondary"
              )}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/settings"
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] min-w-[60px] transition-colors",
            pathname === "/settings" ? "text-accent-teal" : "text-text-secondary"
          )}
        >
          <Settings size={18} />
          <span>More</span>
        </Link>
      </nav>
    </>
  );
}
