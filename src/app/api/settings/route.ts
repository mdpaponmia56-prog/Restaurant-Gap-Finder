import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSettingsStatus, setApiKey } from "@/lib/config";
import { GooglePlacesService } from "@/lib/services/google-places";

export async function GET() {
  try {
    const apiStatus = await getApiSettingsStatus();
    const [totalLeads, totalCampaigns, totalJobs, totalAuditLogs] = await Promise.all([
      prisma.restaurantLead.count(),
      prisma.campaign.count(),
      prisma.researchJob.count(),
      prisma.apiAuditLog.count(),
    ]);

    return NextResponse.json({
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
