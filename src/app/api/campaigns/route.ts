import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {};
    if (search) {
      where.campaign_name = { contains: search };
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        locations: true,
        jobs: {
          orderBy: { created_at: "desc" },
          take: 1,
        },
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    const formatted = campaigns.map((c) => ({
      id: c.id,
      campaign_name: c.campaign_name,
      description: c.description,
      target_lead_count: c.target_lead_count,
      minimum_rating: c.minimum_rating,
      minimum_review_count: c.minimum_review_count,
      business_categories: c.business_categories,
      website_requirement: c.website_requirement,
      status: c.status,
      progress: c.progress,
      created_at: c.created_at,
      started_at: c.started_at,
      completed_at: c.completed_at,
      locations: c.locations,
      lead_count: c._count.leads,
      latest_job: c.jobs[0] || null,
    }));

    return NextResponse.json({ campaigns: formatted });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to list campaigns: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      campaign_name,
      description,
      target_lead_count,
      minimum_rating,
      minimum_review_count,
      business_categories,
      website_requirement,
      locations, // array of location objects
    } = body;

    if (!campaign_name || !campaign_name.trim()) {
      return NextResponse.json(
        { error: "Campaign name is required." },
        { status: 400 }
      );
    }

    if (!locations || !Array.isArray(locations) || locations.length === 0) {
      return NextResponse.json(
        { error: "At least one target location is required." },
        { status: 400 }
      );
    }

    const newCampaign = await prisma.campaign.create({
      data: {
        campaign_name: campaign_name.trim(),
        description: description?.trim() || null,
        target_lead_count: Number(target_lead_count) || 100,
        minimum_rating: Number(minimum_rating) || 3.0,
        minimum_review_count: Number(minimum_review_count) || 50,
        business_categories: (business_categories && business_categories.trim()) || "restaurant",
        website_requirement: website_requirement || "NO_OFFICIAL_WEBSITE",
        status: "DRAFT",
        progress: 0,
        locations: {
          create: locations.map((loc: any) => ({
            country: loc.country || "United States",
            country_code: loc.country_code || "US",
            state_region: loc.state_region || null,
            state_region_code: loc.state_region_code || null,
            city: loc.city || "Unknown City",
            neighborhood: loc.neighborhood || null,
            postal_code: loc.postal_code || null,
            location_mode: loc.location_mode || "CITY",
            location_display_name:
              loc.location_display_name || `${loc.city || "City"}, ${loc.country || "Country"}`,
            location_query:
              loc.location_query ||
              [loc.neighborhood, loc.city, loc.state_region, loc.country]
                .filter(Boolean)
                .join(", "),
            radius: loc.radius ? Number(loc.radius) : null,
            radius_unit: loc.radius_unit || "km",
          })),
        },
      },
      include: {
        locations: true,
      },
    });

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
    });
  } catch (err: any) {
    console.error("Error creating campaign:", err);
    return NextResponse.json(
      { error: "Failed to create campaign: " + err.message },
      { status: 500 }
    );
  }
}
