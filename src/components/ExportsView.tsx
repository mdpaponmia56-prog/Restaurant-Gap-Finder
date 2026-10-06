"use client";

import React, { useEffect, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Filter,
} from "lucide-react";

export function ExportsView() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [websiteStatus, setWebsiteStatus] = useState("");
  const [digitalGapLabel, setDigitalGapLabel] = useState("");
  const [format, setFormat] = useState<"csv" | "json">("csv");

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});
  }, []);

  const handleDownload = () => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (selectedCampaign) params.set("campaignId", selectedCampaign);
    if (websiteStatus) params.set("websiteStatus", websiteStatus);
    if (digitalGapLabel) params.set("digitalGapLabel", digitalGapLabel);

    window.open(`/api/exports?${params.toString()}`, "_blank");
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Data Export Engine
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Export verified database records in RFC 4180 standard CSV or structured JSON for outreach tools, CRM import, and marketing automation.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono">
          Export Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Filter by Campaign
            </label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Campaigns</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.campaign_name} ({c.lead_count} leads)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Website Status
            </label>
            <select
              value={websiteStatus}
              onChange={(e) => setWebsiteStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Leads</option>
              <option value="NO_WEBSITE_VERIFIED">No Website (Verified)</option>
              <option value="SOCIAL_ONLY">Social Media Profile Only</option>
              <option value="MARKETPLACE_ONLY">Marketplace Platform Only</option>
              <option value="HAS_OFFICIAL_WEBSITE">Has Official Website</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Digital Gap Priority
          </label>
          <select
            value={digitalGapLabel}
            onChange={(e) => setDigitalGapLabel(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Opportunity Levels</option>
            <option value="HIGH DIGITAL GAP">High Digital Gap Only</option>
            <option value="MEDIUM DIGITAL GAP">Medium Digital Gap Only</option>
            <option value="LOW DIGITAL GAP">Low Digital Gap Only</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">
            Export Format
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormat("csv")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                format === "csv"
                  ? "border-emerald-500 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-950 hover:bg-slate-900"
              }`}
            >
              <FileSpreadsheet
                className={`h-6 w-6 ${format === "csv" ? "text-emerald-400" : "text-slate-500"}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">CSV Spreadsheet</div>
                <div className="text-[11px] text-slate-400">
                  Formatted for Google Sheets, Microsoft Excel, and CRM importers.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormat("json")}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                format === "json"
                  ? "border-emerald-500 bg-emerald-950/20"
                  : "border-slate-800 bg-slate-950 hover:bg-slate-900"
              }`}
            >
              <FileCode
                className={`h-6 w-6 ${format === "json" ? "text-emerald-400" : "text-slate-500"}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">JSON Document</div>
                <div className="text-[11px] text-slate-400">
                  Full nested payload with sources evidence and verification trail.
                </div>
              </div>
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Download Verified Leads ({format.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
