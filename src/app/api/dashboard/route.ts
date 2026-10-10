import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSettingsStatus } from "@/lib/config";

// In-memory cache for ultra-fast edge/server responses
let cachedDashboardData: any = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 20 * 1000; // 20-second server-side TTL

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const forceFresh = url.searchParams.get("fresh") === "true";

    // Return in-memory cached copy if valid and fresh isn't requested
    const now = Date.now();
    if (!forceFresh && cachedDashboardData && (now - lastCacheTimestamp < CACHE_TTL_MS)) {
      return NextResponse.json(cachedDashboardData, {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          "X-Data-Source": "memory-cache",
        },
      });
    }

    const [
      apiStatus,
      totalCampaigns,
      activeJobs,
      totalLeads,
      noWebsiteLeads,
      needsReviewLeads,
      highGapLeads,
      recentLeads,
      apiAuditStats,
      ratingAggregates,
    ] = await Promise.all([
      getApiSettingsStatus(),
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
      prisma.restaurantLead.aggregate({
        where: { qualification_status: "QUALIFIED" },
        _avg: {
          google_rating: true,
          google_review_count: true,
        },
      }),
    ]);

    const avgRating = ratingAggregates._avg.google_rating
      ? parseFloat(ratingAggregates._avg.google_rating.toFixed(1))
      : 0;
    const avgReviews = ratingAggregates._avg.google_review_count
      ? Math.round(ratingAggregates._avg.google_review_count)
      : 0;

    const payload = {
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
    };

    // Update in-memory cache
    cachedDashboardData = payload;
    lastCacheTimestamp = now;

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        "X-Data-Source": "database",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to load dashboard metrics: " + err.message },
      { status: 500 }
    );
  }
}
