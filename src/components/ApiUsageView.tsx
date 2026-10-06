"use client";

import React, { useEffect, useState } from "react";
import { Activity, RefreshCw, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export function ApiUsageView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/audit-logs?limit=50");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            API Usage & Audit Telemetry
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real external Google Places API requests and HTTP verification probes with latencies and status codes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-850"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="border-b border-slate-800 bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Endpoint</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Summary / Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto h-5 w-5 animate-spin text-emerald-500 mb-2" />
                    Querying audit telemetry...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <Activity className="mx-auto h-8 w-8 text-slate-700 mb-2" />
                    <p className="font-semibold text-slate-300">No API audit logs yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      API requests to Google Places and website prober will automatically be logged here.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isOk = log.status_code && log.status_code >= 200 && log.status_code < 300;
                  const isErr = !log.status_code || log.status_code >= 400;

                  return (
                    <tr key={log.id} className="hover:bg-slate-900/40">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {log.service_name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.endpoint}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${
                            isOk
                              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                              : isErr
                              ? "border-rose-500/30 bg-rose-950/40 text-rose-300"
                              : "border-slate-700 bg-slate-800 text-slate-400"
                          }`}
                        >
                          {log.status_code ? `HTTP ${log.status_code}` : "FAILED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {log.duration_ms ? `${log.duration_ms} ms` : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[300px] truncate text-slate-300">
                        {log.error_message ? (
                          <span className="text-rose-400">{log.error_message}</span>
                        ) : (
                          log.response_summary || log.request_summary || "Success"
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
