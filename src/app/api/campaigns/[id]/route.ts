import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        locations: true,
        jobs: {
          orderBy: { created_at: "desc" },
        },
        _count: {
          select: { leads: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Calculate lead status breakdown
    const leads = await prisma.restaurantLead.findMany({
      where: { campaign_id: id },
      select: {
        website_status: true,
        digital_gap_label: true,
        qualification_status: true,
        google_rating: true,
        google_review_count: true,
      },
    });

    let noWebsiteCount = 0;
    let highGapCount = 0;
    let totalReviews = 0;
    let totalRating = 0;

    leads.forEach((l) => {
      if (
        l.website_status === "NO_WEBSITE_VERIFIED" ||
        l.website_status === "NO_WEBSITE_PROBABLE" ||
        l.website_status === "SOCIAL_ONLY" ||
        l.website_status === "MARKETPLACE_ONLY"
      ) {
        noWebsiteCount++;
      }
      if (l.digital_gap_label === "HIGH DIGITAL GAP") {
        highGapCount++;
      }
      totalReviews += l.google_review_count || 0;
      totalRating += l.google_rating || 0;
    });

    const avgRating = leads.length > 0 ? (totalRating / leads.length).toFixed(1) : "0.0";
    const avgReviews = leads.length > 0 ? Math.round(totalReviews / leads.length) : 0;

    return NextResponse.json({
      campaign: {
        ...campaign,
        lead_count: campaign._count.leads,
        metrics: {
          totalLeads: leads.length,
          noWebsiteCount,
          highGapCount,
          avgRating,
          avgReviews,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch campaign: " + err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Campaign deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to delete campaign: " + err.message },
      { status: 500 }
    );
  }
}
