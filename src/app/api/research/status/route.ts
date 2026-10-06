import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const campaignId = searchParams.get("campaignId");

    let job: any = null;

    if (jobId) {
      job = await prisma.researchJob.findUnique({
        where: { id: jobId },
        include: {
          campaign: {
            include: { locations: true },
          },
        },
      });
    } else if (campaignId) {
      job = await prisma.researchJob.findFirst({
        where: { campaign_id: campaignId },
        orderBy: { created_at: "desc" },
        include: {
          campaign: {
            include: { locations: true },
          },
        },
      });
    } else {
      // Find latest active or latest created job
      job = await prisma.researchJob.findFirst({
        orderBy: { created_at: "desc" },
        include: {
          campaign: {
            include: { locations: true },
          },
        },
      });
    }

    if (!job) {
      return NextResponse.json({ job: null });
    }

    return NextResponse.json({
      job: {
        id: job.id,
        campaign_id: job.campaign_id,
        campaign_name: job.campaign.campaign_name,
        target_lead_count: job.campaign.target_lead_count,
        status: job.status,
        current_stage: job.current_stage,
        progress_percent: job.progress_percent,
        total_discovered: job.total_discovered,
        total_qualified: job.total_qualified,
        total_rejected: job.total_rejected,
        total_needs_review: job.total_needs_review,
        total_duplicates: job.total_duplicates,
        api_requests: job.api_requests,
        current_search_query: job.current_search_query,
        started_at: job.started_at,
        completed_at: job.completed_at,
        error_message: job.error_message,
        locations: job.campaign.locations,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to get research status: " + err.message },
      { status: 500 }
    );
  }
}
