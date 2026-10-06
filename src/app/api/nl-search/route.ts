import { NextRequest, NextResponse } from "next/server";
import { NaturalLanguageSearchService } from "@/lib/services/nl-search";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A search prompt is required." },
        { status: 400 }
      );
    }

    const parsed = NaturalLanguageSearchService.parseQuery(prompt);

    const where: any = {};
    if (parsed.city) {
      where.city = { contains: parsed.city };
    }
    if (parsed.minReviews) {
      where.google_review_count = { gte: parsed.minReviews };
    }
    if (parsed.minRating) {
      where.google_rating = { gte: parsed.minRating };
    }
    if (parsed.websiteRequirement === "NO_OFFICIAL_WEBSITE") {
      where.website_status = {
        in: ["NO_WEBSITE_VERIFIED", "NO_WEBSITE_PROBABLE", "SOCIAL_ONLY", "MARKETPLACE_ONLY"],
      };
    } else if (parsed.websiteRequirement === "HAS_WEBSITE") {
      where.website_status = "HAS_OFFICIAL_WEBSITE";
    }
    if (parsed.digitalGapLabel) {
      where.digital_gap_label = parsed.digitalGapLabel;
    }
    if (parsed.category) {
      where.business_category = { contains: parsed.category };
    }

    const [total, matchingLeads] = await Promise.all([
      prisma.restaurantLead.count({ where }),
      prisma.restaurantLead.findMany({
        where,
        orderBy: { lead_score: "desc" },
        take: 50,
      }),
    ]);

    return NextResponse.json({
      parsed,
      explanation: parsed.rawExplanation,
      totalMatches: total,
      leads: matchingLeads,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to parse search query: " + err.message },
      { status: 500 }
    );
  }
}
