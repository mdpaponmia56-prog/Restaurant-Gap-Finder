import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = 25;
    const skip = (page - 1) * limit;

    const where = {
      OR: [
        { qualification_status: "NEEDS_REVIEW" },
        { verification_status: "PENDING_REVIEW" },
        { website_status: "UNKNOWN" },
      ],
    };

    const [total, leads] = await Promise.all([
      prisma.restaurantLead.count({ where }),
      prisma.restaurantLead.findMany({
        where,
        orderBy: { lead_score: "desc" },
        skip,
        take: limit,
        include: {
          campaign: { select: { campaign_name: true } },
          sources: true,
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
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch verification queue: " + err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, action, notes, manualWebsiteStatus } = body;
    const currentUser = await getCurrentUser();

    if (!leadId || !action) {
      return NextResponse.json(
        { error: "leadId and action (APPROVE | REJECT | MARK_NO_WEBSITE | MARK_HAS_WEBSITE) are required." },
        { status: 400 }
      );
    }

    const lead = await prisma.restaurantLead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    let updateData: any = {};
    let historyChange: any = {};

    if (action === "APPROVE") {
      updateData = {
        qualification_status: "QUALIFIED",
        verification_status: "VERIFIED",
        confidence_level: "HIGH",
      };
      historyChange = {
        field_name: "qualification_status",
        old_value: lead.qualification_status,
        new_value: "QUALIFIED (Approved in Queue)",
      };
    } else if (action === "REJECT") {
      updateData = {
        qualification_status: "REJECTED",
        rejection_reason: notes || "Rejected during manual review",
        verification_status: "REJECTED",
      };
      historyChange = {
        field_name: "qualification_status",
        old_value: lead.qualification_status,
        new_value: "REJECTED",
      };
    } else if (action === "MARK_NO_WEBSITE") {
      updateData = {
        website_status: "NO_WEBSITE_VERIFIED",
        qualification_status: "QUALIFIED",
        verification_status: "VERIFIED",
        confidence_level: "HIGH",
        website_verification_notes: notes || "Manually verified lack of official website.",
      };
      historyChange = {
        field_name: "website_status",
        old_value: lead.website_status,
        new_value: "NO_WEBSITE_VERIFIED",
      };
    } else if (action === "MARK_HAS_WEBSITE") {
      updateData = {
        website_status: "HAS_OFFICIAL_WEBSITE",
        qualification_status: "HAS_WEBSITE",
        verification_status: "VERIFIED",
        confidence_level: "HIGH",
        website_verification_notes: notes || "Manually confirmed official website exists.",
      };
      historyChange = {
        field_name: "website_status",
        old_value: lead.website_status,
        new_value: "HAS_OFFICIAL_WEBSITE",
      };
    }

    if (notes) {
      updateData.outreach_notes = lead.outreach_notes
        ? `${lead.outreach_notes}\n[Review Note]: ${notes}`
        : `[Review Note]: ${notes}`;
    }

    await prisma.$transaction([
      prisma.restaurantLead.update({
        where: { id: leadId },
        data: updateData,
      }),
      prisma.verificationHistory.create({
        data: {
          restaurant_lead_id: leadId,
          field_name: historyChange.field_name,
          old_value: String(historyChange.old_value || ""),
          new_value: String(historyChange.new_value || ""),
          source: "MANUAL_VERIFICATION_QUEUE",
          confidence: "HIGH",
          changed_by: currentUser?.email || "Admin",
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: `Lead updated via action ${action}` });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to process verification action: " + err.message },
      { status: 500 }
    );
  }
}
