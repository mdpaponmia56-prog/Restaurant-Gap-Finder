"use client";

import React from "react";
import {
  LayoutDashboard,
  Compass,
  Building2,
  Bot,
  ClipboardCheck,
  KanbanSquare,
  Download,
  Activity,
  Settings,
  ShieldCheck,
  AlertTriangle,
  LogOut,
  User,
} from "lucide-react";

export type NavTab =
  | "dashboard"
  | "campaigns"
  | "monitor"
  | "leads"
  | "verification"
  | "crm"
  | "exports"
  | "audit"
  | "settings";

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  googleMapsConfigured: boolean;
  currentUser: { email: string; name: string; role: string } | null;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export function Navigation({
  currentTab,
  onSelectTab,
  googleMapsConfigured,
  currentUser,
  onLogout,
  onOpenAuth,
}: NavigationProps) {
  const navItems: { id: NavTab; label: string; icon: React.ElementType }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "campaigns", label: "Campaigns", icon: Compass },
    { id: "monitor", label: "Research Agent", icon: Bot },
    { id: "leads", label: "Restaurant Leads", icon: Building2 },
    { id: "verification", label: "Review Queue", icon: ClipboardCheck },
    { id: "crm", label: "CRM Pipeline", icon: KanbanSquare },
    { id: "exports", label: "Exports", icon: Download },
    { id: "audit", label: "API Usage & Logs", icon: Activity },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 font-black text-slate-950 shadow-lg shadow-emerald-500/20">
            <span className="font-mono text-xl tracking-tighter">RF</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">
                Restaurant Gap Finder
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                PROD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operational B2B Lead Intelligence
            </p>
          </div>
        </div>

        {/* Center Nav tabs */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700"
                    : "text-slate-400 hover:bg-slate-850 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right API Status & User Account */}
        <div className="flex items-center gap-3">
          {/* API Status Pill */}
          <button
            onClick={() => onSelectTab("settings")}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${
              googleMapsConfigured
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-950/60"
                : "border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-950/60 animate-pulse"
            }`}
            title={
              googleMapsConfigured
                ? "Google Places API (New) is configured and active"
                : "Google Places API key is missing. Click to configure."
            }
          >
            {googleMapsConfigured ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Google API Active</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                <span>API Key Missing</span>
              </>
            )}
          </button>

          {/* User Account / Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1.5 text-xs">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="max-w-[120px] truncate text-slate-300">
                  {currentUser.name}
                </span>
                <span className="rounded bg-slate-800 px-1 py-0.2 font-mono text-[9px] text-slate-400">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Scroller */}
      <div className="flex lg:hidden overflow-x-auto border-t border-slate-800 px-4 py-2 space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-slate-800 text-emerald-400 border border-slate-700"
                  : "text-slate-400 hover:bg-slate-850"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}
