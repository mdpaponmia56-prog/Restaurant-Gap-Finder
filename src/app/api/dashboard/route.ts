import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSettingsStatus } from "@/lib/config";

export async function GET() {
  try {
    const apiStatus = await getApiSettingsStatus();

    const [
      totalCampaigns,
      activeJobs,
      totalLeads,
      noWebsiteLeads,
      needsReviewLeads,
      highGapLeads,
      recentLeads,
      apiAuditStats,
    ] = await Promise.all([
      prisma.campaign.count(),
      prisma.researchJob.findMany({
        where: { status: "RUNNING" },
        include: { campaign: { select: { campaign_name: true } } },
        take: 5,
      }),
      prisma.restaurantLead.count({
        where: { qualification_status: "QUALIFIED" },
      }),
      prisma.restaurantLead.count({
        where: {
          website_status: {
            in: ["NO_WEBSITE_VERIFIED", "NO_WEBSITE_PROBABLE", "SOCIAL_ONLY", "MARKETPLACE_ONLY"],
          },
        },
      }),
      prisma.restaurantLead.count({
        where: {
          OR: [
            { qualification_status: "NEEDS_REVIEW" },
            { verification_status: "PENDING_REVIEW" },
            { website_status: "UNKNOWN" },
          ],
        },
      }),
      prisma.restaurantLead.count({
        where: { digital_gap_label: "HIGH DIGITAL GAP" },
      }),
      prisma.restaurantLead.findMany({
        orderBy: { discovered_at: "desc" },
        take: 6,
        select: {
          id: true,
          restaurant_name: true,
          city: true,
          state_region: true,
          google_rating: true,
          google_review_count: true,
          website_status: true,
          digital_gap_score: true,
          digital_gap_label: true,
          discovered_at: true,
        },
      }),
      prisma.apiAuditLog.count({
        where: { service_name: "GOOGLE_PLACES" },
      }),
    ]);

    // Calculate real averages
    const allLeadsForAvg = await prisma.restaurantLead.findMany({
      where: { qualification_status: "QUALIFIED" },
      select: { google_rating: true, google_review_count: true },
    });

    let avgRating = 0;
    let avgReviews = 0;
    if (allLeadsForAvg.length > 0) {
      const sumRating = allLeadsForAvg.reduce((acc, curr) => acc + (curr.google_rating || 0), 0);
      const sumReviews = allLeadsForAvg.reduce((acc, curr) => acc + (curr.google_review_count || 0), 0);
      avgRating = parseFloat((sumRating / allLeadsForAvg.length).toFixed(1));
      avgReviews = Math.round(sumReviews / allLeadsForAvg.length);
    }

    return NextResponse.json({
      googleMapsConfigured: apiStatus.googleMapsConfigured,
      metrics: {
        totalCampaigns,
        activeJobsCount: activeJobs.length,
        totalQualifiedLeads: totalLeads,
        noWebsiteLeads,
        needsReviewLeads,
        highGapLeads,
        avgRating,
        avgReviews,
        googlePlacesApiRequests: apiAuditStats,
      },
      activeJobs,
      recentLeads,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load dashboard metrics: " + err.message },
      { status: 500 }
    );
  }
}
