"use client";

import React, { useEffect, useState } from "react";
import {
  Bot,
  Play,
  Pause,
  XCircle,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Globe,
  Clock,
  Search,
  MapPin,
  ExternalLink,
  Activity,
  Layers,
} from "lucide-react";
import { NavTab } from "./Navigation";

interface ResearchMonitorViewProps {
  activeJobId?: string | null;
  onNavigate: (tab: NavTab) => void;
}

export function ResearchMonitorView({
  activeJobId,
  onNavigate,
}: ResearchMonitorViewProps) {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [controlLoading, setControlLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobStatus = async () => {
    try {
      const url = activeJobId
        ? `/api/research/status?jobId=${activeJobId}`
        : "/api/research/status";
      const res = await fetch(url);
      const data = await res.json();
      setJob(data.job || null);
    } catch (err: any) {
      console.error("Failed to fetch research status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobStatus();
    const interval = setInterval(fetchJobStatus, 3000);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleControl = async (action: "PAUSE" | "RESUME" | "CANCEL") => {
    if (!job?.id) return;
    setControlLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/research/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Control action failed");
      await fetchJobStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setControlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400 text-xs">
        <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
        Connecting to research agent telemetry...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-12 text-center backdrop-blur-md">
        <Bot className="mx-auto h-12 w-12 text-slate-700" />
        <h3 className="mt-4 text-base font-semibold text-white">No active research job</h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
          The research worker is currently idle. Launch a research job from any campaign to observe live Google Places discovery, website probes, and qualification in real time.
        </p>
        <button
          onClick={() => onNavigate("campaigns")}
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Go to Campaigns
        </button>
      </div>
    );
  }

  const isRunning = job.status === "RUNNING";
  const isPaused = job.status === "PAUSED";
  const isCompleted = job.status === "COMPLETED" || job.status === "PARTIALLY_COMPLETED";
  const isFailed = job.status === "FAILED";
  const isCancelled = job.status === "CANCELLED";

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Research Agent Monitor
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold border ${
                isRunning
                  ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 animate-pulse"
                  : isPaused
                  ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                  : isCompleted
                  ? "border-blue-500/30 bg-blue-950/40 text-blue-300"
                  : isFailed
                  ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
                  : "border-slate-700 bg-slate-800 text-slate-400"
              }`}
            >
              {job.status}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Campaign: <span className="font-semibold text-white">{job.campaign_name}</span> | Target:{" "}
            <span className="font-mono text-emerald-400 font-bold">{job.target_lead_count}</span> verified leads
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          {isRunning && (
            <button
              disabled={controlLoading}
              onClick={() => handleControl("PAUSE")}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3.5 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-950/50 disabled:opacity-50 transition-colors"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause Job</span>
            </button>
          )}

          {(isPaused || isFailed) && (
            <button
              disabled={controlLoading}
              onClick={() => handleControl("RESUME")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors shadow-md"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Resume / Retry Job</span>
            </button>
          )}

          {(isRunning || isPaused) && (
            <button
              disabled={controlLoading}
              onClick={() => handleControl("CANCEL")}
              className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-950/60 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel Job</span>
            </button>
          )}

          <button
            onClick={() => onNavigate("leads")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>View Leads</span>
          </button>
        </div>
      </div>

      {/* Error state alert */}
      {job.error_message && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-5 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-rose-200">
                Research Worker Reported An Issue
              </h3>
              <p className="text-xs text-rose-300/90 leading-relaxed font-mono">
                {job.error_message}
              </p>
              {job.error_message.toLowerCase().includes("key") && (
                <button
                  onClick={() => onNavigate("settings")}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Configure Google API Key
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Pipeline Status Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        {/* Stage & Progress Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400 font-mono">
                Current Execution Stage
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {job.current_stage || "INITIALIZING"}
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400">Started:</span>{" "}
              <span className="text-white">
                {job.started_at ? new Date(job.started_at).toLocaleTimeString() : "—"}
              </span>
            </div>
            {job.completed_at && (
              <div>
                <span className="text-slate-400">Finished:</span>{" "}
                <span className="text-white">
                  {new Date(job.completed_at).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Current Query telemetry */}
        <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 font-mono text-xs space-y-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Search className="h-3.5 w-3.5 text-emerald-400" />
            <span>Active Places API Query:</span>
          </div>
          <div className="text-sm font-semibold text-white pl-5">
            &quot;{job.current_search_query || "Awaiting search query..."}&quot;
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">
              Progress: <strong className="text-white">{job.progress_percent}%</strong> of target
            </span>
            <span className="text-emerald-400 font-bold">
              {job.total_qualified} / {job.target_lead_count} Qualified
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-950 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-500"
              style={{ width: `${Math.max(3, job.progress_percent)}%` }}
            />
          </div>
        </div>

        {/* Real Counters Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 pt-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-center">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono text-[10px]">
              Discovered
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {job.total_discovered}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3.5 text-center">
            <div className="text-xs text-emerald-400 uppercase tracking-wider font-mono text-[10px]">
              Qualified
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {job.total_qualified}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-center">
            <div className="text-xs text-rose-400 uppercase tracking-wider font-mono text-[10px]">
              Rejected
            </div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1">
              {job.total_rejected}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-center">
            <div className="text-xs text-amber-400 uppercase tracking-wider font-mono text-[10px]">
              Needs Review
            </div>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {job.total_needs_review}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-center">
            <div className="text-xs text-indigo-400 uppercase tracking-wider font-mono text-[10px]">
              Duplicates
            </div>
            <div className="text-xl font-bold font-mono text-indigo-400 mt-1">
              {job.total_duplicates}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3.5 text-center">
            <div className="text-xs text-cyan-400 uppercase tracking-wider font-mono text-[10px]">
              API Requests
            </div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {job.api_requests}
            </div>
          </div>
        </div>
      </div>

      {/* Verified Pipeline Architecture Explanation */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-emerald-400" />
          Autonomous Pipeline Stages
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300 font-mono">
          <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
            <span className="text-emerald-400 block font-bold">1. Discovery</span>
            Google Places (New) search
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
            <span className="text-emerald-400 block font-bold">2. Qualification</span>
            Rating & Review filtering
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
            <span className="text-emerald-400 block font-bold">3. Website Probe</span>
            Domain & SSRF check
          </div>
          <div className="rounded-lg bg-slate-900/60 p-2.5 border border-slate-800/80">
            <span className="text-emerald-400 block font-bold">4. Scoring & DB</span>
            Opportunity score & persist
          </div>
        </div>
      </div>
    </div>
  );
}
