"use client";

import React, { useEffect, useState } from "react";
import {
  Compass,
  Play,
  Pause,
  RefreshCw,
  Building2,
  MapPin,
  Trash2,
  ArrowRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { NavTab } from "./Navigation";

interface CampaignsViewProps {
  onOpenBuilder: () => void;
  onNavigate: (tab: NavTab) => void;
  onFilterLeadsByCampaign: (campaignId: string) => void;
  onOpenMonitor: (jobId?: string) => void;
}

export function CampaignsView({
  onOpenBuilder,
  onNavigate,
  onFilterLeadsByCampaign,
  onOpenMonitor,
}: CampaignsViewProps) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const json = await res.json();
      setCampaigns(json.campaigns || []);
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStartResearch = async (campaignId: string) => {
    setActionLoading(campaignId);
    setError(null);
    try {
      const res = await fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.needsConfig) {
          setError(data.error);
          onNavigate("settings");
          return;
        }
        throw new Error(data.error || "Failed to start research");
      }

      await fetchCampaigns();
      onOpenMonitor(data.jobId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm("Are you sure you want to delete this campaign? All research jobs will be removed.")) {
      return;
    }
    setActionLoading(campaignId);
    try {
      await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      await fetchCampaigns();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Research Campaigns
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Geographic targeting, minimum review criteria, and active research operations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaigns}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-850"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={onOpenBuilder}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-12 text-center backdrop-blur-md">
          <Compass className="mx-auto h-12 w-12 text-slate-700" />
          <h3 className="mt-4 text-base font-semibold text-white">No campaigns created yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            Create your first campaign to define target cities, minimum rating/review thresholds, and discover digitally underserved restaurants.
          </p>
          <button
            onClick={onOpenBuilder}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {campaigns.map((camp) => {
            const isRunning = camp.status === "RUNNING";
            const isCompleted = camp.status === "COMPLETED" || camp.status === "PARTIALLY_COMPLETED";
            const isDraft = camp.status === "DRAFT";

            return (
              <div
                key={camp.id}
                className="glass-card flex flex-col justify-between rounded-xl border border-slate-800 p-5 transition-all hover:border-slate-700"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white">
                          {camp.campaign_name}
                        </h3>
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-semibold border ${
                            isRunning
                              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400 animate-pulse"
                              : isCompleted
                              ? "border-blue-500/30 bg-blue-950/40 text-blue-300"
                              : "border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {camp.status}
                        </span>
                      </div>
                      {camp.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                          {camp.description}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteCampaign(camp.id)}
                      disabled={isRunning || actionLoading === camp.id}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-950/40 hover:text-rose-400 disabled:opacity-30 transition-colors"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Locations */}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {camp.locations.map((loc: any) => (
                      <span
                        key={loc.id}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-900 border border-slate-800 px-2 py-1 font-mono text-[11px] text-slate-300"
                      >
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        <span>{loc.city}, {loc.country_code}</span>
                      </span>
                    ))}
                  </div>

                  {/* Criteria summary */}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 font-mono">
                    <div>
                      <span className="block text-slate-500">Min Reviews</span>
                      <span className="font-semibold text-white">≥ {camp.minimum_review_count}</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Min Rating</span>
                      <span className="font-semibold text-white">≥ {camp.minimum_rating}★</span>
                    </div>
                    <div>
                      <span className="block text-slate-500">Category</span>
                      <span className="font-semibold text-white capitalize">{camp.business_categories}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-slate-400">Leads Qualified</span>
                      <span className="font-semibold text-white">
                        {camp.lead_count} / {camp.target_lead_count}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.round((camp.lead_count / camp.target_lead_count) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
                  <button
                    onClick={() => {
                      onFilterLeadsByCampaign(camp.id);
                      onNavigate("leads");
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>View Leads ({camp.lead_count})</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {isRunning ? (
                      <button
                        onClick={() => onOpenMonitor(camp.latest_job?.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Live Monitor</span>
                      </button>
                    ) : (
                      <button
                        disabled={actionLoading === camp.id}
                        onClick={() => handleStartResearch(camp.id)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{camp.lead_count > 0 ? "Re-Run Research" : "Start Research"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
