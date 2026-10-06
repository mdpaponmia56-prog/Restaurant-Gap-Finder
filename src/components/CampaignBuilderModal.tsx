"use client";

import React, { useState } from "react";
import {
  X,
  Compass,
  MapPin,
  Utensils,
  Star,
  Globe,
  Target,
  CheckCircle2,
  AlertTriangle,
  Play,
} from "lucide-react";

interface CampaignBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaignId: string, autoStart: boolean) => void;
  isGoogleConfigured: boolean;
}

export function CampaignBuilderModal({
  isOpen,
  onClose,
  onCampaignCreated,
  isGoogleConfigured,
}: CampaignBuilderModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [description, setDescription] = useState("");

  // Location state
  const [country, setCountry] = useState("United States");
  const [countryCode, setCountryCode] = useState("US");
  const [stateRegion, setStateRegion] = useState("California");
  const [city, setCity] = useState("Los Angeles");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locationMode, setLocationMode] = useState<"CITY" | "AREA" | "RADIUS" | "POSTAL_CODE">("CITY");
  const [radius, setRadius] = useState("15");

  // Criteria
  const [category, setCategory] = useState("restaurant");
  const [minRating, setMinRating] = useState("3.0");
  const [minReviews, setMinReviews] = useState("100");
  const [websiteRequirement, setWebsiteRequirement] = useState<
    "NO_OFFICIAL_WEBSITE" | "ANY" | "HAS_WEBSITE"
  >("NO_OFFICIAL_WEBSITE");
  const [targetCount, setTargetCount] = useState("100");

  if (!isOpen) return null;

  const handleSubmit = async (autoStart: boolean) => {
    if (!campaignName.trim()) {
      setError("Please provide a campaign name.");
      setStep(1);
      return;
    }

    if (!city.trim()) {
      setError("Please specify a target city.");
      setStep(2);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const locationQuery = [neighborhood, city, stateRegion, country]
        .filter(Boolean)
        .join(", ");

      const payload = {
        campaign_name: campaignName.trim(),
        description: description.trim() || undefined,
        target_lead_count: parseInt(targetCount, 10) || 100,
        minimum_rating: parseFloat(minRating) || 3.0,
        minimum_review_count: parseInt(minReviews, 10) || 50,
        business_categories: category.trim() || "restaurant",
        website_requirement: websiteRequirement,
        locations: [
          {
            country,
            country_code: countryCode,
            state_region: stateRegion,
            city,
            neighborhood: neighborhood || undefined,
            postal_code: postalCode || undefined,
            location_mode: locationMode,
            location_display_name: `${city}${stateRegion ? `, ${stateRegion}` : ""}, ${country}`,
            location_query: locationQuery,
            radius: locationMode === "RADIUS" ? parseFloat(radius) : undefined,
            radius_unit: "km",
          },
        ],
      };

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign.");
      }

      onCampaignCreated(data.campaign.id, autoStart);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create Research Campaign</h2>
              <p className="text-xs text-slate-400">
                Configure real location parameters and Google Places criteria.
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

        {/* Step Indicator */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/30 text-center text-xs">
          {[
            { id: 1, label: "Campaign Info" },
            { id: 2, label: "Location" },
            { id: 3, label: "Google Criteria" },
            { id: 4, label: "Review & Launch" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`py-3 font-medium transition-colors border-b-2 ${
                step === s.id
                  ? "border-emerald-500 text-emerald-400 bg-slate-900/60 font-semibold"
                  : step > s.id
                  ? "border-transparent text-slate-300"
                  : "border-transparent text-slate-500 hover:text-slate-400"
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* STEP 1: Campaign Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. LA High Volume Restaurants Without Website"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Outreach Objective
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional internal notes for the sales or agency team..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Lead Count (Real qualified businesses)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["25", "50", "100", "250"].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setTargetCount(count)}
                      className={`rounded-lg py-2 text-xs font-medium border transition-colors ${
                        targetCount === count
                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {count} Leads
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  The system will discover up to this target. If fewer qualify, it will report the exact verified shortfall rather than fabricating leads.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Country *
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    value={stateRegion}
                    onChange={(e) => setStateRegion(e.target.value)}
                    placeholder="e.g. California"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Target City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Los Angeles"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Neighborhood / Area (Optional)
                  </label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="e.g. Hollywood, Downtown, Venice"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Location Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "CITY", label: "Entire City" },
                    { id: "AREA", label: "Neighborhood" },
                    { id: "RADIUS", label: "Radius Boundary" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setLocationMode(mode.id as any)}
                      className={`rounded-lg py-2 text-xs font-medium border ${
                        locationMode === mode.id
                          ? "border-emerald-500 bg-emerald-950/40 text-emerald-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {locationMode === "RADIUS" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Radius: {radius} km
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className="w-full accent-emerald-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Google Criteria & Website */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="restaurant">All Restaurants & Dining</option>
                  <option value="mexican restaurant">Mexican Restaurants</option>
                  <option value="italian restaurant">Italian Restaurants</option>
                  <option value="pizzeria">Pizzerias & Italian</option>
                  <option value="japanese restaurant">Japanese & Sushi</option>
                  <option value="chinese restaurant">Chinese Restaurants</option>
                  <option value="cafe">Cafes & Bakeries</option>
                  <option value="seafood restaurant">Seafood</option>
                  <option value="steak house">Steakhouses</option>
                  <option value="bbq restaurant">Barbecue / BBQ</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Minimum Google Rating
                  </label>
                  <select
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="3.0">3.0+ Stars</option>
                    <option value="3.5">3.5+ Stars</option>
                    <option value="4.0">4.0+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Minimum Review Volume
                  </label>
                  <select
                    value={minReviews}
                    onChange={(e) => setMinReviews(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="25">25+ Reviews</option>
                    <option value="50">50+ Reviews</option>
                    <option value="100">100+ Reviews</option>
                    <option value="200">200+ Reviews</option>
                    <option value="500">500+ Reviews</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Website Status Requirement
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "NO_OFFICIAL_WEBSITE",
                      title: "No Official Website (Recommended)",
                      desc: "Qualified only if no working custom domain is found (socials and third-party delivery links don't count).",
                    },
                    {
                      id: "ANY",
                      title: "Any Website Status",
                      desc: "Collect all restaurants meeting rating and review thresholds regardless of website presence.",
                    },
                    {
                      id: "HAS_WEBSITE",
                      title: "Has Official Website",
                      desc: "Only restaurants with verified working official domains.",
                    },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      onClick={() => setWebsiteRequirement(opt.id as any)}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        websiteRequirement === opt.id
                          ? "border-emerald-500 bg-emerald-950/20"
                          : "border-slate-800 bg-slate-950 hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="radio"
                        name="website_req"
                        checked={websiteRequirement === opt.id}
                        onChange={() => {}}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <div className="text-xs font-semibold text-white">
                          {opt.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Launch */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Campaign Name:</span>
                  <span className="text-white font-semibold">{campaignName || "Untitled Campaign"}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Target Location:</span>
                  <span className="text-emerald-400 font-semibold">{city}, {stateRegion}, {country}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-white">{category}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Rating & Reviews:</span>
                  <span className="text-amber-300">≥ {minRating}★ and ≥ {minReviews} reviews</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Website Filter:</span>
                  <span className="text-white">{websiteRequirement}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Discovery Count:</span>
                  <span className="text-white font-bold">{targetCount} leads</span>
                </div>
              </div>

              {!isGoogleConfigured && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-950/30 p-3 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-semibold">Notice:</span> Google Maps API key is not configured. You can save this campaign as DRAFT now and configure the API key in Settings before launching research.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/50 px-6 py-4">
          <button
            type="button"
            disabled={step === 1 || loading}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="rounded-lg border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-850 disabled:opacity-40"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(4, s + 1))}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-md"
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSubmit(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 transition-colors"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Start Research Now</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
