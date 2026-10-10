import React from "react";

export function MetricCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 border border-slate-800/80 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-slate-800 rounded"></div>
        <div className="h-8 w-8 bg-slate-800/80 rounded-lg"></div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-7 w-20 bg-slate-700/80 rounded"></div>
        <div className="h-3 w-32 bg-slate-800/60 rounded"></div>
      </div>
    </div>
  );
}

export function LeadTableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-slate-800/40">
      <td className="px-4 py-3.5">
        <div className="h-4 w-36 bg-slate-800 rounded"></div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-24 bg-slate-800/60 rounded"></div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-3.5 w-20 bg-slate-800/60 rounded"></div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-16 bg-slate-800/80 rounded"></div>
      </td>
      <td className="px-4 py-3.5">
        <div className="h-4 w-28 bg-slate-800/80 rounded"></div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="ml-auto h-6 w-14 bg-slate-800/80 rounded"></div>
      </td>
    </tr>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-slate-800 rounded"></div>
          <div className="h-4 w-96 bg-slate-800/60 rounded"></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-16 bg-slate-800 rounded-lg"></div>
          <div className="h-8 w-32 bg-emerald-950/60 rounded-lg"></div>
        </div>
      </div>

      {/* 4 Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Leads Table Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5 animate-pulse">
            <div className="h-5 w-52 bg-slate-800 rounded"></div>
            <div className="h-3 w-64 bg-slate-800/60 rounded"></div>
          </div>
          <div className="h-4 w-24 bg-slate-800/60 rounded animate-pulse"></div>
        </div>

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
              <tbody className="divide-y divide-slate-800/60">
                <LeadTableRowSkeleton />
                <LeadTableRowSkeleton />
                <LeadTableRowSkeleton />
                <LeadTableRowSkeleton />
                <LeadTableRowSkeleton />
                <LeadTableRowSkeleton />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ViewSkeleton({ title }: { title: string }) {
  return (
    <div className="space-y-6 pb-12 animate-pulse">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-slate-800 rounded"></div>
          <div className="h-4 w-72 bg-slate-800/60 rounded"></div>
        </div>
        <div className="h-9 w-28 bg-slate-800 rounded-lg"></div>
      </div>

      <div className="h-72 rounded-xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col items-center justify-center space-y-3">
        <div className="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Loading {title} modules...</p>
      </div>
    </div>
  );
}
