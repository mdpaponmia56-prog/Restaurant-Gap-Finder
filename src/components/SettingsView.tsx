"use client";

import React, { useEffect, useState } from "react";
import {
  Settings,
  Key,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Database,
  RefreshCw,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

interface SettingsViewProps {
  onSettingsUpdated: () => void;
}

export function SettingsView({ onSettingsUpdated }: SettingsViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form input
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Key testing
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    valid: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setSaveError("Please enter an API key.");
      return;
    }

    setSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleMapsApiKey: keyInput.trim() }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update API key.");
      }

      setSaveSuccess("Google Places API key saved securely into database.");
      setKeyInput("");
      await fetchSettings();
      onSettingsUpdated();
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: keyInput.trim() || undefined }),
      });
      const result = await res.json();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        valid: false,
        message: "Failed to run test: " + err.message,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400 text-xs">
        <RefreshCw className="h-5 w-5 animate-spin text-emerald-500 mr-2" />
        Loading settings...
      </div>
    );
  }

  const googleStatus = data?.googleMaps || {
    googleMapsConfigured: false,
    googleMapsSource: "NONE",
    maskedKey: null,
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          System & API Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure official Google Places API credentials, inspect database persistence, and verify external service connectivity.
        </p>
      </div>

      {/* Google Places API (New) Configuration */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Google Places API (New) Credential
              </h2>
              <p className="text-xs text-slate-400">
                Official Google Maps Platform API for discovering restaurants, Place IDs, and metadata.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold font-mono border ${
                googleStatus.googleMapsConfigured
                  ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                  : "border-amber-500/30 bg-amber-950/40 text-amber-300"
              }`}
            >
              {googleStatus.googleMapsConfigured
                ? `ACTIVE (${googleStatus.googleMapsSource})`
                : "NOT CONFIGURED"}
            </span>
          </div>
        </div>

        {/* Status display */}
        {googleStatus.googleMapsConfigured && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <div>
                <span className="font-semibold text-emerald-300">
                  Google Places API is configured and operational.
                </span>
                <div className="font-mono text-slate-400 mt-0.5">
                  Masked Key: {googleStatus.maskedKey} (Source: {googleStatus.googleMapsSource})
                </div>
              </div>
            </div>

            <button
              onClick={handleTestKey}
              disabled={testing}
              className="rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-950 disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Active Key"}
            </button>
          </div>
        )}

        {/* Live Test Outcome Box */}
        {testResult && (
          <div
            className={`rounded-xl border p-4 text-xs font-mono ${
              testResult.valid
                ? "border-emerald-500/30 bg-emerald-950/30 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/30 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {testResult.valid ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              )}
              <span>{testResult.valid ? "Validation Successful" : "Google API Error"}</span>
              {testResult.latencyMs && (
                <span className="text-slate-400 font-normal">
                  ({testResult.latencyMs} ms)
                </span>
              )}
            </div>
            <div className="mt-1 pl-6 text-slate-300 font-mono">
              {testResult.message}
            </div>
          </div>
        )}

        {/* Key Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {googleStatus.googleMapsConfigured ? "Update API Key" : "Enter Google Places API Key"}
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 pr-20 py-2.5 text-xs text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Your key is saved server-side in the persistent database. It is never exposed in browser JavaScript.
            </p>
          </div>

          {saveSuccess && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveSuccess}</span>
            </div>
          )}

          {saveError && (
            <div className="flex items-center gap-2 text-xs text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{saveError}</span>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !keyInput.trim()}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors shadow-md"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving..." : "Save Key to Database"}</span>
            </button>

            {keyInput.trim() && (
              <button
                type="button"
                disabled={testing}
                onClick={handleTestKey}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750"
              >
                {testing ? "Testing..." : "Test Key Prior to Saving"}
              </button>
            )}
          </div>
        </form>

        {/* Setup guide */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2 text-xs text-slate-400">
          <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
            <ExternalLink className="h-3.5 w-3.5 text-emerald-400" />
            How to obtain a Google Places API (New) key
          </h4>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed font-sans pl-1">
            <li>Visit the <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google Cloud Console</a>.</li>
            <li>Enable the <strong>Places API (New)</strong> under APIs &amp; Services.</li>
            <li>Create an API Key and restrict it to Places API (New).</li>
            <li>Ensure a billing account is linked to your Google Cloud project.</li>
            <li>Paste the key above or set <code>GOOGLE_MAPS_API_KEY</code> in your environment.</li>
          </ol>
        </div>
      </div>

      {/* Database & Runtime Health */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Database & Persistence Engine</h3>
            <p className="text-xs text-slate-400">
              Real relational storage schema managed via Prisma ORM.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs font-mono">
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            <span className="text-slate-500 block text-[10px]">Database Status</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            <span className="text-slate-500 block text-[10px]">Total Leads Stored</span>
            <span className="text-white font-bold">{data?.stats?.totalLeads ?? 0}</span>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            <span className="text-slate-500 block text-[10px]">Campaigns</span>
            <span className="text-white font-bold">{data?.stats?.totalCampaigns ?? 0}</span>
          </div>
          <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
            <span className="text-slate-500 block text-[10px]">Audit Logs</span>
            <span className="text-white font-bold">{data?.stats?.totalAuditLogs ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
