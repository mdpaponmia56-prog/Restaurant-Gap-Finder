"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Globe,
  AlertCircle,
  TrendingUp,
  Star,
  MessageSquare,
  Compass,
  ArrowRight,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { NavTab } from "./Navigation";

interface DashboardProps {
  onNavigate: (tab: NavTab) => void;
  onOpenLead: (leadId: string) => void;
}

export function DashboardView({ onNavigate, onOpenLead }: DashboardProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [controlLoading, setControlLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh periodically if an active job is running
    const interval = setInterval(() => {
      fetchDashboard();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleControlJob = async (jobId: string, action: "PAUSE" | "RESUME" | "CANCEL") => {
    setControlLoading(true);
    try {
      await fetch("/api/research/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, action }),
      });
      await fetchDashboard();
    } catch (err) {
      console.error("Control action failed:", err);
    } finally {
      setControlLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-500" />
          <span>Loading verified operational intelligence...</span>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalCampaigns: 0,
    activeJobsCount: 0,
    totalQualifiedLeads: 0,
    noWebsiteLeads: 0,
    needsReviewLeads: 0,
    highGapLeads: 0,
    avgRating: 0,
    avgReviews: 0,
    googlePlacesApiRequests: 0,
  };

  const activeJobs = data?.activeJobs || [];
  const recentLeads = data?.recentLeads || [];
  const isGoogleConfigured = data?.googleMapsConfigured;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner if API Key is not configured */}
      {!isGoogleConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 sm:p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-200">
                  Google Maps API Key Not Configured
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  To discover real restaurant listings, connect your official Google Places API (New) key. Zero mock data policy is strictly enforced.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate("settings")}
              className="shrink-0 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
            >
              Configure API Key
            </button>
          </div>
        </div>
      )}

      {/* Header with Title and Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Operational Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time pipeline metrics, automated website verification, and digital gap discovery.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchDashboard();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-850 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-emerald-400" : ""}`} />
            <span>Sync</span>
          </button>
          <button
            onClick={() => onNavigate("campaigns")}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            <Compass className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Qualified Leads */}
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Qualified Leads
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {metrics.totalQualifiedLeads.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {metrics.totalCampaigns} active campaigns
            </p>
          </div>
        </div>

        {/* No Official Website */}
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Website Gaps
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {metrics.noWebsiteLeads.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Verified without official website
            </p>
          </div>
        </div>

        {/* High Digital Gap */}
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              High Digital Gap
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {metrics.highGapLeads.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Score ≥ 65 (Top opportunity)
            </p>
          </div>
        </div>

        {/* Avg Rating & Reviews */}
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Avg Social Proof
            </span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics.avgRating > 0 ? metrics.avgRating : "—"}
            </span>
            <span className="text-xs text-slate-400">
              ★ ({metrics.avgReviews > 0 ? `${metrics.avgReviews} revs` : "0 revs"})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Google Places verified volume
          </p>
        </div>
      </div>

      {/* Active Research Monitor (If any job is running) */}
      {activeJobs.length > 0 && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">
                    Active Research Worker Running
                  </h3>
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] text-emerald-300">
                    {activeJobs[0].campaign?.campaign_name}
                  </span>
                </div>
                <p className="text-xs font-mono text-emerald-300/80 mt-0.5">
                  Stage: {activeJobs[0].current_stage} | Query: &quot;{activeJobs[0].current_search_query || "Querying Places API..."}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={controlLoading}
                onClick={() => handleControlJob(activeJobs[0].id, "PAUSE")}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
              <button
                disabled={controlLoading}
                onClick={() => handleControlJob(activeJobs[0].id, "CANCEL")}
                className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-950/60 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={() => onNavigate("monitor")}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors ml-2"
              >
                <span>Live Monitor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span>Progress: {activeJobs[0].progress_percent}%</span>
              <span>
                Qualified: {activeJobs[0].total_qualified} | Discovered: {activeJobs[0].total_discovered} | API Requests: {activeJobs[0].api_requests}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.max(5, activeJobs[0].progress_percent)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Recent Leads Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Recent Verified Restaurant Leads
            </h2>
            <p className="text-xs text-slate-400">
              Real businesses evaluated for digital website opportunity.
            </p>
          </div>
          <button
            onClick={() => onNavigate("leads")}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>View All Leads ({metrics.totalQualifiedLeads})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {recentLeads.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-12 text-center">
            <Building2 className="mx-auto h-8 w-8 text-slate-600" />
            <h3 className="mt-3 text-sm font-semibold text-slate-300">
              No Restaurant Leads Yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Launch a research campaign to discover real restaurants using official Google Places API and verify website gaps.
            </p>
            <button
              onClick={() => onNavigate("campaigns")}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
            >
              Start First Campaign
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Restaurant</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Google Reviews</th>
                    <th className="px-4 py-3">Website Status</th>
                    <th className="px-4 py-3">Digital Gap</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {recentLeads.map((lead: any) => {
                    const isNoWeb =
                      lead.website_status === "NO_WEBSITE_VERIFIED" ||
                      lead.website_status === "NO_WEBSITE_PROBABLE";
                    const isSocial = lead.website_status === "SOCIAL_ONLY";
                    const isMarketplace = lead.website_status === "MARKETPLACE_ONLY";

                    return (
                      <tr
                        key={lead.id}
                        className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                        onClick={() => onOpenLead(lead.id)}
                      >
                        <td className="px-4 py-3.5 font-semibold text-white">
                          {lead.restaurant_name}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400">
                          {lead.city || "—"}{lead.state_region ? `, ${lead.state_region}` : ""}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-amber-300">
                              {lead.google_rating ? `${lead.google_rating}★` : "—"}
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              ({lead.google_review_count} reviews)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          {isNoWeb ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                              No Website
                            </span>
                          ) : isSocial ? (
                            <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                              Social Only
                            </span>
                          ) : isMarketplace ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                              Marketplace Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                              Has Website
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">
                              {lead.digital_gap_score}
                            </span>
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">
                              {lead.digital_gap_label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLead(lead.id);
                            }}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
