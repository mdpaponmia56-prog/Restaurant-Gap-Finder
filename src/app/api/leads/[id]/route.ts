import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await prisma.restaurantLead.findUnique({
      where: { id },
      include: {
        campaign: {
          select: { id: true, campaign_name: true },
        },
        sources: {
          orderBy: { checked_at: "desc" },
        },
        history: {
          orderBy: { changed_at: "desc" },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Restaurant lead not found" }, { status: 404 });
    }

    return NextResponse.json({ lead });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to fetch lead: " + err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const currentUser = await getCurrentUser();

    const existingLead = await prisma.restaurantLead.findUnique({
      where: { id },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const {
      outreach_status,
      outreach_notes,
      assigned_to,
      verification_status,
      website_status,
      owner_name,
      primary_email,
      primary_phone,
      qualification_status,
    } = body;

    const dataToUpdate: any = {};
    const historyEntries: any[] = [];

    // Track field modifications into VerificationHistory
    const checkAndLogChange = (field: string, newValue: any, oldValue: any) => {
      if (newValue !== undefined && newValue !== oldValue) {
        dataToUpdate[field] = newValue;
        historyEntries.push({
          restaurant_lead_id: id,
          field_name: field,
          old_value: String(oldValue ?? ""),
          new_value: String(newValue ?? ""),
          source: "USER_MANUAL",
          confidence: "HIGH",
          changed_by: currentUser?.email || "Admin",
        });
      }
    };

    checkAndLogChange("outreach_status", outreach_status, existingLead.outreach_status);
    checkAndLogChange("outreach_notes", outreach_notes, existingLead.outreach_notes);
    checkAndLogChange("assigned_to", assigned_to, existingLead.assigned_to);
    checkAndLogChange("verification_status", verification_status, existingLead.verification_status);
    checkAndLogChange("website_status", website_status, existingLead.website_status);
    checkAndLogChange("owner_name", owner_name, existingLead.owner_name);
    checkAndLogChange("primary_email", primary_email, existingLead.primary_email);
    checkAndLogChange("primary_phone", primary_phone, existingLead.primary_phone);
    checkAndLogChange("qualification_status", qualification_status, existingLead.qualification_status);

    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updated_at = new Date();

      await prisma.$transaction([
        prisma.restaurantLead.update({
          where: { id },
          data: dataToUpdate,
        }),
        ...historyEntries.map((h) =>
          prisma.verificationHistory.create({ data: h })
        ),
      ]);
    }

    const updatedLead = await prisma.restaurantLead.findUnique({
      where: { id },
      include: {
        sources: true,
        history: { orderBy: { changed_at: "desc" } },
      },
    });

    return NextResponse.json({
      success: true,
      lead: updatedLead,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to update lead: " + err.message },
      { status: 500 }
    );
  }
}
