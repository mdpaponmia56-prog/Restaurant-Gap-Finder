import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ResearchWorkerService } from "@/lib/services/research-worker";
import { getApiKey } from "@/lib/config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required." },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { locations: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (campaign.locations.length === 0) {
      return NextResponse.json(
        { error: "Campaign has no configured locations. Please add at least one location." },
        { status: 400 }
      );
    }

    // Check if Google Maps API key is configured
    const apiKey = await getApiKey("GOOGLE_MAPS_API_KEY");
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Google Maps API key is not configured. Please open Settings to connect your Google Places API (New) key before starting research.",
          needsConfig: true,
        },
        { status: 400 }
      );
    }

    // Create a new ResearchJob
    const job = await prisma.researchJob.create({
      data: {
        campaign_id: campaignId,
        status: "QUEUED",
        current_stage: "QUEUED",
        progress_percent: 0,
        total_discovered: 0,
        total_qualified: 0,
        total_rejected: 0,
        total_needs_review: 0,
        total_duplicates: 0,
        api_requests: 0,
      },
    });

    // Start background research worker asynchronously
    await ResearchWorkerService.startJob(job.id);

    return NextResponse.json({
      success: true,
      message: "Research job started in background.",
      jobId: job.id,
      campaignId,
    });
  } catch (err: any) {
    console.error("Error starting research job:", err);
    return NextResponse.json(
      { error: "Failed to start research: " + err.message },
      { status: 500 }
    );
  }
}
