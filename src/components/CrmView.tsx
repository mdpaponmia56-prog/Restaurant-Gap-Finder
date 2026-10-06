"use client";

import React, { useEffect, useState } from "react";
import {
  KanbanSquare,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Star,
  ExternalLink,
} from "lucide-react";

interface CrmViewProps {
  onOpenLead: (leadId: string) => void;
}

export function CrmView({ onOpenLead }: CrmViewProps) {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const stages = [
    { id: "NEW", label: "New Leads", color: "border-slate-700 bg-slate-900/50" },
    { id: "CONTACTED", label: "Contacted", color: "border-blue-500/20 bg-blue-950/20" },
    { id: "IN_CONVERSATION", label: "In Conversation", color: "border-amber-500/20 bg-amber-950/20" },
    { id: "MEETING_BOOKED", label: "Meeting Booked", color: "border-indigo-500/20 bg-indigo-950/20" },
    { id: "PROPOSAL_SENT", label: "Proposal Sent", color: "border-purple-500/20 bg-purple-950/20" },
    { id: "CLOSED_WON", label: "Closed Won", color: "border-emerald-500/20 bg-emerald-950/20" },
  ];

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/leads?limit=100");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err) {
      console.error("Failed to load CRM leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            CRM Outreach Pipeline
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track sales conversations, web design proposals, and client acquisitions.
          </p>
        </div>

        <button
          onClick={fetchLeads}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-850"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Pipeline</span>
        </button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
          Loading sales pipeline...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageLeads = leads.filter(
              (l) => (l.outreach_status || "NEW") === stage.id
            );

            return (
              <div
                key={stage.id}
                className={`rounded-xl border ${stage.color} p-3.5 flex flex-col min-w-[220px] max-h-[75vh]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3">
                  <span className="font-semibold text-xs text-white">
                    {stage.label}
                  </span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-400">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards List */}
                <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="text-center py-8 text-[11px] text-slate-600 font-mono">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => onOpenLead(lead.id)}
                        className="rounded-lg border border-slate-800 bg-slate-950 p-3 hover:border-emerald-500/40 transition-colors cursor-pointer space-y-2"
                      >
                        <div className="font-semibold text-xs text-white line-clamp-1">
                          {lead.restaurant_name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>{lead.city || "—"}</span>
                          <span className="text-amber-300 font-mono">
                            {lead.google_rating}★
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-900">
                          <span className="text-emerald-400 font-bold">
                            Score: {lead.lead_score}
                          </span>
                          <span className="text-slate-500">
                            {lead.google_review_count} revs
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
