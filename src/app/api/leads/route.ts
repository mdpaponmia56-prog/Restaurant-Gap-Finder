import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { NaturalLanguageSearchService } from "@/lib/services/nl-search";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const query = searchParams.get("query")?.trim() || "";
    const campaignId = searchParams.get("campaignId") || undefined;
    const city = searchParams.get("city") || undefined;
    const websiteStatus = searchParams.get("websiteStatus") || undefined;
    const qualificationStatus = searchParams.get("qualificationStatus") || undefined;
    const digitalGapLabel = searchParams.get("digitalGapLabel") || undefined;
    const outreachStatus = searchParams.get("outreachStatus") || undefined;
    const minRating = searchParams.get("minRating")
      ? parseFloat(searchParams.get("minRating")!)
      : undefined;
    const minReviews = searchParams.get("minReviews")
      ? parseInt(searchParams.get("minReviews")!, 10)
      : undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    const sortBy = searchParams.get("sortBy") || "lead_score";
    const sortOrder = (searchParams.get("sortOrder") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const where: any = {};

    let nlInterpreted: any = null;

    // If query looks like a natural language prompt (e.g. > 15 chars or contains keywords like "reviews", "rating", "without", "with", "restaurants in")
    const isNaturalLanguage =
      query.length > 15 ||
      /\b(reviews?|rating|stars?|in|with|without|having|restaurants?)\b/i.test(query);

    if (query && isNaturalLanguage) {
      const parsed = NaturalLanguageSearchService.parseQuery(query);
      nlInterpreted = parsed;

      if (parsed.city && !city) {
        where.city = { contains: parsed.city };
      }
      if (parsed.minReviews && !minReviews) {
        where.google_review_count = { gte: parsed.minReviews };
      }
      if (parsed.minRating && !minRating) {
        where.google_rating = { gte: parsed.minRating };
      }
      if (parsed.websiteRequirement === "NO_OFFICIAL_WEBSITE" && !websiteStatus) {
        where.website_status = {
          in: ["NO_WEBSITE_VERIFIED", "NO_WEBSITE_PROBABLE", "SOCIAL_ONLY", "MARKETPLACE_ONLY"],
        };
      } else if (parsed.websiteRequirement === "HAS_WEBSITE" && !websiteStatus) {
        where.website_status = "HAS_OFFICIAL_WEBSITE";
      }
      if (parsed.digitalGapLabel && !digitalGapLabel) {
        where.digital_gap_label = parsed.digitalGapLabel;
      }
      if (parsed.category) {
        where.business_category = { contains: parsed.category };
      }
    } else if (query) {
      // Standard text search on restaurant name, address, category, or city
      where.OR = [
        { restaurant_name: { contains: query } },
        { address: { contains: query } },
        { city: { contains: query } },
        { business_category: { contains: query } },
        { primary_phone: { contains: query } },
      ];
    }

    if (campaignId) where.campaign_id = campaignId;
    if (city && !where.city) where.city = { contains: city };
    if (websiteStatus) where.website_status = websiteStatus;
    if (qualificationStatus) where.qualification_status = qualificationStatus;
    if (digitalGapLabel) where.digital_gap_label = digitalGapLabel;
    if (outreachStatus) where.outreach_status = outreachStatus;
    if (minRating && !where.google_rating) where.google_rating = { gte: minRating };
    if (minReviews && !where.google_review_count) where.google_review_count = { gte: minReviews };

    const validSortFields = [
      "lead_score",
      "digital_gap_score",
      "google_rating",
      "google_review_count",
      "restaurant_name",
      "discovered_at",
      "created_at",
    ];
    const orderField = validSortFields.includes(sortBy) ? sortBy : "lead_score";

    const [total, leads] = await Promise.all([
      prisma.restaurantLead.count({ where }),
      prisma.restaurantLead.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: limit,
        include: {
          campaign: {
            select: { id: true, campaign_name: true },
          },
          _count: {
            select: { sources: true },
          },
        },
      }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      parsedNlQuery: nlInterpreted,
    });
  } catch (err: any) {
    console.error("Error fetching leads:", err);
    return NextResponse.json(
      { error: "Failed to fetch leads: " + err.message },
      { status: 500 }
    );
  }
}
