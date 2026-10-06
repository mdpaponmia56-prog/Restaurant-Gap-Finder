"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  Search,
  Filter,
  Download,
  Star,
  Globe,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  SlidersHorizontal,
  X,
} from "lucide-react";

interface LeadsViewProps {
  onOpenLead: (leadId: string) => void;
  initialCampaignId?: string | null;
}

export function LeadsView({ onOpenLead, initialCampaignId }: LeadsViewProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [campaignId, setCampaignId] = useState<string | null>(initialCampaignId || null);
  const [websiteStatus, setWebsiteStatus] = useState<string>("");
  const [digitalGapLabel, setDigitalGapLabel] = useState<string>("");
  const [minRating, setMinRating] = useState<string>("");
  const [minReviews, setMinReviews] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("lead_score");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [parsedNlQuery, setParsedNlQuery] = useState<any>(null);

  const [campaignsList, setCampaignsList] = useState<any[]>([]);

  useEffect(() => {
    // Fetch available campaigns for filter dropdown
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaignsList(data.campaigns || []))
      .catch(() => {});
  }, []);

  const fetchLeads = async (pageToFetch: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pageToFetch.toString());
      params.set("limit", pagination.limit.toString());
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      if (searchQuery.trim()) params.set("query", searchQuery.trim());
      if (campaignId) params.set("campaignId", campaignId);
      if (websiteStatus) params.set("websiteStatus", websiteStatus);
      if (digitalGapLabel) params.set("digitalGapLabel", digitalGapLabel);
      if (minRating) params.set("minRating", minRating);
      if (minReviews) params.set("minReviews", minReviews);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const data = await res.json();

      setLeads(data.leads || []);
      setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      setParsedNlQuery(data.parsedNlQuery || null);
    } catch (err) {
      console.error("Failed to fetch leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads(1);
  }, [campaignId, websiteStatus, digitalGapLabel, minRating, minReviews, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads(1);
  };

  const handleExport = (format: "csv" | "json") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (campaignId) params.set("campaignId", campaignId);
    if (websiteStatus) params.set("websiteStatus", websiteStatus);
    if (digitalGapLabel) params.set("digitalGapLabel", digitalGapLabel);
    if (minRating) params.set("minRating", minRating);
    if (minReviews) params.set("minReviews", minReviews);

    window.open(`/api/exports?${params.toString()}`, "_blank");
  };

  const clearAllFilters = () => {
    setSearchQuery("");
    setCampaignId(null);
    setWebsiteStatus("");
    setDigitalGapLabel("");
    setMinRating("");
    setMinReviews("");
    setParsedNlQuery(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Restaurant Lead Intelligence
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real qualified restaurants, verified website presence, and sales opportunity scores.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Natural Language & Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Ask natural language questions: "Show me Mexican restaurants in Los Angeles with more than 500 reviews and no official website"...'
            className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-10 pr-24 py-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none shadow-sm"
          />
          <button
            type="submit"
            className="absolute right-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Natural Language interpretation chip */}
        {parsedNlQuery && parsedNlQuery.rawExplanation && (
          <div className="mt-2 flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-300 font-mono">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <span>{parsedNlQuery.rawExplanation}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setParsedNlQuery(null);
                fetchLeads(1);
              }}
              className="text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </form>

      {/* Structured Filter Pills */}
      <div className="glass-panel rounded-xl p-4 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium font-mono text-[11px] uppercase mr-1">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Campaign Filter */}
        <select
          value={campaignId || ""}
          onChange={(e) => setCampaignId(e.target.value || null)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Campaigns</option>
          {campaignsList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.campaign_name}
            </option>
          ))}
        </select>

        {/* Website Status Filter */}
        <select
          value={websiteStatus}
          onChange={(e) => setWebsiteStatus(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Website Statuses</option>
          <option value="NO_WEBSITE_VERIFIED">No Website (Verified)</option>
          <option value="SOCIAL_ONLY">Social Profile Only</option>
          <option value="MARKETPLACE_ONLY">Marketplace Only</option>
          <option value="HAS_OFFICIAL_WEBSITE">Has Official Website</option>
          <option value="UNKNOWN">Unknown / Needs Review</option>
        </select>

        {/* Digital Gap Filter */}
        <select
          value={digitalGapLabel}
          onChange={(e) => setDigitalGapLabel(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">All Opportunity Scores</option>
          <option value="HIGH DIGITAL GAP">High Digital Gap (≥ 65)</option>
          <option value="MEDIUM DIGITAL GAP">Medium Digital Gap (40-64)</option>
          <option value="LOW DIGITAL GAP">Low Digital Gap (&lt; 40)</option>
        </select>

        {/* Min Reviews */}
        <select
          value={minReviews}
          onChange={(e) => setMinReviews(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Any Review Count</option>
          <option value="50">50+ Reviews</option>
          <option value="100">100+ Reviews</option>
          <option value="200">200+ Reviews</option>
          <option value="500">500+ Reviews</option>
        </select>

        {/* Min Rating */}
        <select
          value={minRating}
          onChange={(e) => setMinRating(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
        >
          <option value="">Any Rating</option>
          <option value="3.5">3.5+ Stars</option>
          <option value="4.0">4.0+ Stars</option>
          <option value="4.5">4.5+ Stars</option>
        </select>

        {/* Sort By */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 font-mono focus:border-emerald-500 focus:outline-none ml-auto"
        >
          <option value="lead_score">Sort: Opportunity Score</option>
          <option value="google_review_count">Sort: Review Count</option>
          <option value="google_rating">Sort: Star Rating</option>
          <option value="discovered_at">Sort: Discovered Date</option>
        </select>

        {(campaignId || websiteStatus || digitalGapLabel || minRating || minReviews || searchQuery) && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-slate-400 hover:text-white underline font-mono"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Leads Table Container */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
              <tr>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">City / Address</th>
                <th className="px-4 py-3">Google Reviews</th>
                <th className="px-4 py-3">Website Status</th>
                <th className="px-4 py-3">Contact Signals</th>
                <th className="px-4 py-3">Opportunity Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-500 mb-2" />
                    Querying verified restaurant leads...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Building2 className="mx-auto h-8 w-8 text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">No restaurants matched criteria</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try adjusting the filter thresholds or launch a new campaign to discover more leads.
                    </p>
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isNoWeb =
                    lead.website_status === "NO_WEBSITE_VERIFIED" ||
                    lead.website_status === "NO_WEBSITE_PROBABLE";
                  const isSocial = lead.website_status === "SOCIAL_ONLY";
                  const isMarketplace = lead.website_status === "MARKETPLACE_ONLY";

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onOpenLead(lead.id)}
                      className="hover:bg-slate-900/50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="font-medium">{lead.restaurant_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {lead.business_category || "Restaurant"}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-300 max-w-[200px] truncate">
                        <div>{lead.city || "—"}</div>
                        <div className="text-[11px] text-slate-400 truncate">{lead.address}</div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-amber-300">
                            {lead.google_rating ? `${lead.google_rating}★` : "—"}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({lead.google_review_count} revs)
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
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

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-400">
                          {lead.primary_phone || lead.international_phone ? (
                            <span title={lead.primary_phone || lead.international_phone}>
                              <Phone className="h-3.5 w-3.5 text-emerald-400" />
                            </span>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                          {lead.primary_email && (
                            <span title={lead.primary_email}>
                              <Mail className="h-3.5 w-3.5 text-blue-400" />
                            </span>
                          )}
                          {lead.instagram_url && (
                            <span className="text-[10px] text-pink-400 font-mono">IG</span>
                          )}
                          {lead.facebook_url && (
                            <span className="text-[10px] text-blue-400 font-mono">FB</span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-emerald-400">
                            {lead.lead_score}
                          </span>
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-300">
                            {lead.digital_gap_label}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenLead(lead.id);
                          }}
                          className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-400 font-mono">
          <div>
            Showing <strong className="text-white">{leads.length}</strong> of{" "}
            <strong className="text-white">{pagination.total}</strong> qualified leads
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchLeads(pagination.page - 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1.5 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <span className="text-slate-300">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => fetchLeads(pagination.page + 1)}
              className="flex items-center gap-1 rounded-lg border border-slate-800 px-2.5 py-1.5 hover:bg-slate-800 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
