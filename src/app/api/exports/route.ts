import { NextRequest, NextResponse } from "next/server";
import { ExportService } from "@/lib/services/export";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get("format") || "csv").toLowerCase();

    const campaignId = searchParams.get("campaignId") || undefined;
    const websiteStatus = searchParams.get("websiteStatus") || undefined;
    const city = searchParams.get("city") || undefined;
    const digitalGapLabel = searchParams.get("digitalGapLabel") || undefined;
    const qualificationStatus = searchParams.get("qualificationStatus") || undefined;
    const minRating = searchParams.get("minRating")
      ? parseFloat(searchParams.get("minRating")!)
      : undefined;
    const minReviews = searchParams.get("minReviews")
      ? parseInt(searchParams.get("minReviews")!, 10)
      : undefined;

    const filters = {
      campaignId,
      websiteStatus,
      city,
      digitalGapLabel,
      qualificationStatus,
      minRating,
      minReviews,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    if (format === "json") {
      const jsonData = await ExportService.exportToJson(filters);
      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="restaurant-leads-${timestamp}.json"`,
        },
      });
    }

    // Default: CSV format
    const csvData = await ExportService.exportToCsv(filters);
    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="restaurant-leads-${timestamp}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to export leads: " + err.message },
      { status: 500 }
    );
  }
}
