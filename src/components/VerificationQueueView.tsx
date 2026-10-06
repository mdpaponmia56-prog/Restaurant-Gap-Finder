"use client";

import React, { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Check,
  X,
  Globe,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Building2,
  FileText,
} from "lucide-react";

interface VerificationQueueViewProps {
  onOpenLead: (leadId: string) => void;
}

export function VerificationQueueView({ onOpenLead }: VerificationQueueViewProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({});

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/verification-queue");
      const data = await res.json();
      setItems(data.leads || []);
    } catch (err) {
      console.error("Failed to load queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (
    leadId: string,
    action: "APPROVE" | "REJECT" | "MARK_NO_WEBSITE" | "MARK_HAS_WEBSITE"
  ) => {
    setActionLoading(leadId);
    try {
      await fetch("/api/verification-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          action,
          notes: reviewNote[leadId] || undefined,
        }),
      });
      await fetchQueue();
    } catch (err) {
      console.error("Action error:", err);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Manual Verification Queue
            </h1>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-xs font-bold text-amber-300 border border-amber-500/30">
              {items.length} Pending Review
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Ambiguous listings requiring human verification before sales outreach. Every action is logged in audit history.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-850"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
          Loading verification queue...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-12 text-center backdrop-blur-md">
          <ClipboardCheck className="mx-auto h-12 w-12 text-emerald-500/40" />
          <h3 className="mt-4 text-base font-semibold text-white">Verification Queue is Empty</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
            No restaurant leads currently require manual review. High-confidence automated classifications have been saved directly to Qualified Leads.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((lead) => (
            <div
              key={lead.id}
              className="glass-card rounded-xl border border-slate-800 p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      {lead.restaurant_name}
                    </h3>
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-300 border border-amber-500/20">
                      {lead.website_status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {lead.address || "Address unavailable"} | Category: {lead.business_category}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenLead(lead.id)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                  >
                    <span>Full Details</span>
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Diagnosis notes */}
              <div className="rounded-lg bg-slate-950/60 p-3 text-xs font-mono text-slate-300 border border-slate-800/80">
                <span className="text-slate-500">Automated Audit Note: </span>
                {lead.website_verification_notes || "Ambiguous website response or domain."}
              </div>

              {/* Note input */}
              <div>
                <input
                  type="text"
                  placeholder="Optional review note (e.g. 'Confirmed no domain exists on Yelp/Facebook either')..."
                  value={reviewNote[lead.id] || ""}
                  onChange={(e) =>
                    setReviewNote((prev) => ({ ...prev, [lead.id]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-800/60">
                <button
                  disabled={actionLoading === lead.id}
                  onClick={() => handleAction(lead.id, "REJECT")}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reject</span>
                </button>
                <button
                  disabled={actionLoading === lead.id}
                  onClick={() => handleAction(lead.id, "MARK_HAS_WEBSITE")}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  <Globe className="h-3.5 w-3.5 text-blue-400" />
                  <span>Confirm Has Website</span>
                </button>
                <button
                  disabled={actionLoading === lead.id}
                  onClick={() => handleAction(lead.id, "MARK_NO_WEBSITE")}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 shadow-sm"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Confirm No Website (Approve)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
