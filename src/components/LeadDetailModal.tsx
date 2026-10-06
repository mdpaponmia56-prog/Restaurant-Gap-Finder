"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Star,
  ExternalLink,
  ShieldCheck,
  Clock,
  User,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
  History,
  TrendingUp,
} from "lucide-react";

interface LeadDetailModalProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

export function LeadDetailModal({
  leadId,
  onClose,
  onLeadUpdated,
}: LeadDetailModalProps) {
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "sources" | "history" | "crm">("overview");

  // Editable fields
  const [outreachStatus, setOutreachStatus] = useState("NEW");
  const [outreachNotes, setOutreachNotes] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [verificationStatus, setVerificationStatus] = useState("VERIFIED");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      const data = await res.json();
      if (data.lead) {
        setLead(data.lead);
        setOutreachStatus(data.lead.outreach_status || "NEW");
        setOutreachNotes(data.lead.outreach_notes || "");
        setPrimaryEmail(data.lead.primary_email || "");
        setPrimaryPhone(data.lead.primary_phone || "");
        setOwnerName(data.lead.owner_name || "");
        setVerificationStatus(data.lead.verification_status || "VERIFIED");
      }
    } catch (err) {
      console.error("Failed to load lead details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadDetails();
  }, [leadId]);

  if (!leadId) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreach_status: outreachStatus,
          outreach_notes: outreachNotes,
          primary_email: primaryEmail || null,
          primary_phone: primaryPhone || null,
          owner_name: ownerName || null,
          verification_status: verificationStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLead(data.lead);
        setSaveMessage("Lead details updated successfully.");
        if (onLeadUpdated) onLeadUpdated();
      }
    } catch (err: any) {
      setSaveMessage("Error updating lead: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400 border border-emerald-500/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {loading ? "Loading..." : lead?.restaurant_name}
                </h2>
                {lead && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400 border border-slate-700">
                    {lead.business_category || "Restaurant"}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-emerald-400" />
                <span>{lead?.address || "Address unavailable"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 text-xs font-medium space-x-4">
          {[
            { id: "overview", label: "Overview & Evidence", icon: FileText },
            { id: "crm", label: "CRM Outreach", icon: User },
            { id: "sources", label: `Sources Checked (${lead?.sources?.length || 0})`, icon: ShieldCheck },
            { id: "history", label: `Audit Trail (${lead?.history?.length || 0})`, icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-emerald-500 text-emerald-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Container */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-slate-400">
              Loading verified records...
            </div>
          ) : !lead ? (
            <div className="text-center py-12 text-slate-400">Lead not found.</div>
          ) : (
            <>
              {saveMessage && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{saveMessage}</span>
                </div>
              )}

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Digital Gap Score Hero Card */}
                  <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-slate-950 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-mono text-emerald-400 font-semibold">
                        Digital Opportunity Score
                      </span>
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-3xl font-extrabold font-mono text-white">
                          {lead.lead_score}
                          <span className="text-sm font-normal text-slate-400"> / 100</span>
                        </span>
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-300 border border-emerald-500/30">
                          {lead.digital_gap_label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        High customer volume with established reputation but no official website asset.
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-slate-800 sm:pl-6 space-y-1">
                      <div className="text-slate-400">Google Reputation</div>
                      <div className="text-base font-bold text-amber-300 flex items-center gap-1 sm:justify-end">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>{lead.google_rating}★</span>
                        <span className="text-slate-400 text-xs font-normal">
                          ({lead.google_review_count} reviews)
                        </span>
                      </div>
                      <a
                        href={lead.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline pt-1"
                      >
                        <span>Open Google Maps Listing</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  {/* Website Verification Diagnosis Box */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] font-mono flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-rose-400" />
                        Website Status Diagnosis
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold border ${
                          lead.website_status.includes("NO_WEBSITE")
                            ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
                            : lead.website_status === "SOCIAL_ONLY"
                            ? "border-indigo-500/30 bg-indigo-950/40 text-indigo-300"
                            : lead.website_status === "MARKETPLACE_ONLY"
                            ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                            : "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                        }`}
                      >
                        {lead.website_status}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-mono text-[11px]">
                      {lead.website_verification_notes || "Website status checked during discovery."}
                    </p>
                    {lead.official_website && (
                      <div className="pt-2 text-slate-400">
                        Evaluated URL:{" "}
                        <a
                          href={lead.official_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline break-all"
                        >
                          {lead.official_website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Public Business Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Contact info */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                      <h4 className="font-semibold text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                        Public Business Contact
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-500" /> Phone:
                          </span>
                          <span className="font-mono text-white">
                            {lead.primary_phone || lead.international_phone || "Not Found"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-slate-500" /> Email:
                          </span>
                          <span className="font-mono text-white">
                            {lead.primary_email || "Not Found"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">WhatsApp Status:</span>
                          <span className="font-mono text-slate-300">{lead.whatsapp_status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Social presence */}
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
                      <h4 className="font-semibold text-slate-300 font-mono text-[11px] uppercase tracking-wider">
                        Social Discovery
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Instagram className="h-3.5 w-3.5 text-pink-400" /> Instagram:
                          </span>
                          {lead.instagram_url ? (
                            <a
                              href={lead.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline max-w-[150px] truncate"
                            >
                              Profile
                            </a>
                          ) : (
                            <span className="text-slate-500">Not Found</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Facebook className="h-3.5 w-3.5 text-blue-400" /> Facebook:
                          </span>
                          {lead.facebook_url ? (
                            <a
                              href={lead.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline max-w-[150px] truncate"
                            >
                              Page
                            </a>
                          ) : (
                            <span className="text-slate-500">Not Found</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Decision Maker:</span>
                          <span className="font-mono text-white">
                            {lead.owner_name || "Not Publicly Listed"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Google Place Identity */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-1.5 font-mono text-[11px]">
                    <div className="text-slate-400">Google Place ID (Unique External Identity):</div>
                    <div className="text-emerald-300 font-bold select-all break-all">
                      {lead.google_place_id}
                    </div>
                  </div>
                </div>
              )}

              {/* CRM OUTREACH TAB */}
              {activeTab === "crm" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Outreach Status
                      </label>
                      <select
                        value={outreachStatus}
                        onChange={(e) => setOutreachStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="NEW">NEW LEAD</option>
                        <option value="CONTACTED">CONTACTED</option>
                        <option value="IN_CONVERSATION">IN CONVERSATION</option>
                        <option value="MEETING_BOOKED">MEETING BOOKED</option>
                        <option value="PROPOSAL_SENT">PROPOSAL SENT</option>
                        <option value="CLOSED_WON">CLOSED WON</option>
                        <option value="CLOSED_LOST">CLOSED LOST</option>
                        <option value="NOT_INTERESTED">NOT INTERESTED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Manual Verification Status
                      </label>
                      <select
                        value={verificationStatus}
                        onChange={(e) => setVerificationStatus(e.target.value)}
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="VERIFIED">VERIFIED</option>
                        <option value="PENDING_REVIEW">PENDING REVIEW</option>
                        <option value="UNVERIFIED">UNVERIFIED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Primary Phone
                      </label>
                      <input
                        type="text"
                        value={primaryPhone}
                        onChange={(e) => setPrimaryPhone(e.target.value)}
                        placeholder="e.g. (310) 555-0199"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Primary Email
                      </label>
                      <input
                        type="email"
                        value={primaryEmail}
                        onChange={(e) => setPrimaryEmail(e.target.value)}
                        placeholder="e.g. contact@domain.com"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Owner / Decision Maker
                      </label>
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="e.g. Maria Gonzalez"
                        className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Outreach Notes & Activity Log
                    </label>
                    <textarea
                      rows={5}
                      value={outreachNotes}
                      onChange={(e) => setOutreachNotes(e.target.value)}
                      placeholder="Add conversation notes, call outcomes, follow-up deadlines..."
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      disabled={saving}
                      onClick={handleSave}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>{saving ? "Saving..." : "Save CRM Updates"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SOURCES TAB */}
              {activeTab === "sources" && (
                <div className="space-y-4">
                  <p className="text-slate-400">
                    Source evidence trail collected during automated research. Every lead point is linked to its verifying external endpoint.
                  </p>
                  <div className="space-y-2">
                    {lead.sources?.map((source: any) => (
                      <div
                        key={source.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-white text-[11px]">
                            {source.source_name} ({source.source_type})
                          </span>
                          <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                            Confidence: {source.confidence}
                          </span>
                        </div>
                        {source.source_url && (
                          <div className="text-slate-400 truncate">
                            URL:{" "}
                            <a
                              href={source.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline"
                            >
                              {source.source_url}
                            </a>
                          </div>
                        )}
                        {source.information_found && (
                          <div className="text-slate-300 font-mono text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                            {source.information_found}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-500 font-mono">
                          Checked at: {new Date(source.checked_at).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AUDIT TRAIL TAB */}
              {activeTab === "history" && (
                <div className="space-y-4">
                  <p className="text-slate-400">
                    Chronological audit log of all changes made to this lead record.
                  </p>
                  {lead.history?.length === 0 ? (
                    <div className="text-slate-500 text-center py-8">
                      No manual field edits recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {lead.history?.map((h: any) => (
                        <div
                          key={h.id}
                          className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 font-mono text-xs flex justify-between items-start"
                        >
                          <div>
                            <span className="font-semibold text-white">
                              Field &quot;{h.field_name}&quot;
                            </span>{" "}
                            updated from &quot;{h.old_value || "empty"}&quot; to{" "}
                            <strong className="text-emerald-400">&quot;{h.new_value}&quot;</strong>
                            <div className="text-[10px] text-slate-500 mt-1">
                              By: {h.changed_by} ({h.source})
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.changed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/60 px-6 py-3 text-xs text-slate-400">
          <span>Discovered: {lead ? new Date(lead.discovered_at).toLocaleDateString() : "—"}</span>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-800 px-3 py-1.5 font-semibold text-slate-300 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
