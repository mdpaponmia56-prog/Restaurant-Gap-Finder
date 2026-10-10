"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Navigation, NavTab } from "@/components/Navigation";
import { DashboardView } from "@/components/DashboardView";
import { ViewSkeleton } from "@/components/Skeletons";

// Dynamically lazy-load secondary views to reduce initial bundle size and speed up LCP
const CampaignsView = dynamic(
  () => import("@/components/CampaignsView").then((mod) => mod.CampaignsView),
  { loading: () => <ViewSkeleton title="Campaigns" /> }
);

const ResearchMonitorView = dynamic(
  () => import("@/components/ResearchMonitorView").then((mod) => mod.ResearchMonitorView),
  { loading: () => <ViewSkeleton title="Research Agent" /> }
);

const LeadsView = dynamic(
  () => import("@/components/LeadsView").then((mod) => mod.LeadsView),
  { loading: () => <ViewSkeleton title="Restaurant Leads" /> }
);

const VerificationQueueView = dynamic(
  () => import("@/components/VerificationQueueView").then((mod) => mod.VerificationQueueView),
  { loading: () => <ViewSkeleton title="Review Queue" /> }
);

const CrmView = dynamic(
  () => import("@/components/CrmView").then((mod) => mod.CrmView),
  { loading: () => <ViewSkeleton title="CRM Pipeline" /> }
);

const ExportsView = dynamic(
  () => import("@/components/ExportsView").then((mod) => mod.ExportsView),
  { loading: () => <ViewSkeleton title="Exports" /> }
);

const ApiUsageView = dynamic(
  () => import("@/components/ApiUsageView").then((mod) => mod.ApiUsageView),
  { loading: () => <ViewSkeleton title="API Usage & Logs" /> }
);

const SettingsView = dynamic(
  () => import("@/components/SettingsView").then((mod) => mod.SettingsView),
  { loading: () => <ViewSkeleton title="Settings" /> }
);

// Modals are loaded strictly on demand when user opens them
const CampaignBuilderModal = dynamic(
  () => import("@/components/CampaignBuilderModal").then((mod) => mod.CampaignBuilderModal)
);

const LeadDetailModal = dynamic(
  () => import("@/components/LeadDetailModal").then((mod) => mod.LeadDetailModal)
);

const AuthModal = dynamic(
  () => import("@/components/AuthModal").then((mod) => mod.AuthModal)
);

export default function Home() {
  const [currentTab, setCurrentTab] = useState<NavTab>("dashboard");
  const [googleMapsConfigured, setGoogleMapsConfigured] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Cross-view state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [filteredCampaignId, setFilteredCampaignId] = useState<string | null>(null);

  // Check auth and settings status on load
  const checkStatus = async () => {
    try {
      const [settingsRes, authRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/auth/me"),
      ]);

      const settingsData = await settingsRes.json();
      const authData = await authRes.json();

      setGoogleMapsConfigured(!!settingsData?.googleMaps?.googleMapsConfigured);
      if (authData?.authenticated && authData.user) {
        setCurrentUser(authData.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Error loading application status:", err);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleCampaignCreated = (campaignId: string, autoStart: boolean) => {
    if (autoStart) {
      // Start research
      fetch("/api/research/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.jobId) {
            setActiveJobId(data.jobId);
            setCurrentTab("monitor");
          } else {
            setCurrentTab("campaigns");
          }
        })
        .catch(() => {
          setCurrentTab("campaigns");
        });
    } else {
      setCurrentTab("campaigns");
    }
  };

  const handleOpenMonitor = (jobId?: string) => {
    if (jobId) setActiveJobId(jobId);
    setCurrentTab("monitor");
  };

  const handleFilterLeadsByCampaign = (campaignId: string) => {
    setFilteredCampaignId(campaignId);
    setCurrentTab("leads");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== "leads") setFilteredCampaignId(null);
          setCurrentTab(tab);
        }}
        googleMapsConfigured={googleMapsConfigured}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {currentTab === "dashboard" && (
          <DashboardView
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenLead={(id) => setSelectedLeadId(id)}
          />
        )}

        {currentTab === "campaigns" && (
          <CampaignsView
            onOpenBuilder={() => setIsBuilderOpen(true)}
            onNavigate={(tab) => setCurrentTab(tab)}
            onFilterLeadsByCampaign={handleFilterLeadsByCampaign}
            onOpenMonitor={handleOpenMonitor}
          />
        )}

        {currentTab === "monitor" && (
          <ResearchMonitorView
            activeJobId={activeJobId}
            onNavigate={(tab) => setCurrentTab(tab)}
          />
        )}

        {currentTab === "leads" && (
          <LeadsView
            onOpenLead={(id) => setSelectedLeadId(id)}
            initialCampaignId={filteredCampaignId}
          />
        )}

        {currentTab === "verification" && (
          <VerificationQueueView onOpenLead={(id) => setSelectedLeadId(id)} />
        )}

        {currentTab === "crm" && (
          <CrmView onOpenLead={(id) => setSelectedLeadId(id)} />
        )}

        {currentTab === "exports" && <ExportsView />}

        {currentTab === "audit" && <ApiUsageView />}

        {currentTab === "settings" && (
          <SettingsView onSettingsUpdated={checkStatus} />
        )}
      </main>

      {/* Modals */}
      <CampaignBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onCampaignCreated={handleCampaignCreated}
        isGoogleConfigured={googleMapsConfigured}
      />

      <LeadDetailModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="mx-auto max-w-7xl px-4">
          Restaurant Website Gap Finder — Operational B2B Lead Intelligence Engine | Zero-Mock Guarantee
        </div>
      </footer>
    </div>
  );
}
