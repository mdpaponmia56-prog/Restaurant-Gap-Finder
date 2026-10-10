import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSettingsStatus, setApiKey } from "@/lib/config";
import { GooglePlacesService } from "@/lib/services/google-places";

// In-memory cache for settings
let cachedSettingsData: any = null;
let lastSettingsCacheTime = 0;
const SETTINGS_CACHE_TTL = 30 * 1000;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceFresh = url.searchParams.get("fresh") === "true";
    const now = Date.now();

    if (!forceFresh && cachedSettingsData && (now - lastSettingsCacheTime < SETTINGS_CACHE_TTL)) {
      return NextResponse.json(cachedSettingsData, {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
          "X-Data-Source": "memory-cache",
        },
      });
    }

    const apiStatus = await getApiSettingsStatus();
    const [totalLeads, totalCampaigns, totalJobs, totalAuditLogs] = await Promise.all([
      prisma.restaurantLead.count(),
      prisma.campaign.count(),
      prisma.researchJob.count(),
      prisma.apiAuditLog.count(),
    ]);

    const payload = {
      googleMaps: apiStatus,
      stats: {
        totalLeads,
        totalCampaigns,
        totalJobs,
        totalAuditLogs,
      },
      database: {
        type: "PostgreSQL (Neon Cloud Database via Prisma)",
        status: "CONNECTED",
      },
    };

    cachedSettingsData = payload;
    lastSettingsCacheTime = now;

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        "X-Data-Source": "database",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch settings: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { googleMapsApiKey } = body;

    if (googleMapsApiKey !== undefined) {
      if (typeof googleMapsApiKey !== "string") {
        return NextResponse.json({ error: "Invalid key format." }, { status: 400 });
      }

      await setApiKey(
        "GOOGLE_MAPS_API_KEY",
        googleMapsApiKey,
        "Google Places API (New) Secret Key"
      );
    }

    // Invalidate cached settings
    cachedSettingsData = null;
    lastSettingsCacheTime = 0;

    const updatedStatus = await getApiSettingsStatus();
    return NextResponse.json({
      success: true,
      message: "API settings updated successfully.",
      status: updatedStatus,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to update settings: " + err.message },
      { status: 500 }
    );
  }
}
