import { prisma } from "../prisma";

export interface ExportFilterOptions {
  campaignId?: string;
  websiteStatus?: string;
  minRating?: number;
  minReviews?: number;
  city?: string;
  digitalGapLabel?: string;
  qualificationStatus?: string;
}

export class ExportService {
  /**
   * Escape and format a value for RFC 4180 CSV
   */
  private static escapeCsv(value: any): string {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Export real database leads to CSV format
   */
  static async exportToCsv(filters: ExportFilterOptions = {}): Promise<string> {
    const where: any = {};
    if (filters.campaignId) where.campaign_id = filters.campaignId;
    if (filters.websiteStatus) where.website_status = filters.websiteStatus;
    if (filters.city) where.city = { contains: filters.city };
    if (filters.digitalGapLabel) where.digital_gap_label = filters.digitalGapLabel;
    if (filters.qualificationStatus) where.qualification_status = filters.qualificationStatus;
    if (filters.minRating) where.google_rating = { gte: filters.minRating };
    if (filters.minReviews) where.google_review_count = { gte: filters.minReviews };

    const leads = await prisma.restaurantLead.findMany({
      where,
      orderBy: { lead_score: "desc" },
    });

    const headers = [
      "ID",
      "Restaurant Name",
      "Google Place ID",
      "Google Maps URL",
      "Category",
      "Google Rating",
      "Review Count",
      "Business Status",
      "City",
      "State",
      "Country",
      "Address",
      "Primary Phone",
      "International Phone",
      "WhatsApp Status",
      "Primary Email",
      "Official Website",
      "Website Status",
      "Website Verification Notes",
      "Facebook URL",
      "Instagram URL",
      "Owner Name",
      "Decision Maker Role",
      "Lead Score",
      "Digital Gap Score",
      "Digital Gap Label",
      "Qualification Status",
      "Confidence Level",
      "Discovered At",
    ];

    const rows = leads.map((lead) => [
      this.escapeCsv(lead.id),
      this.escapeCsv(lead.restaurant_name),
      this.escapeCsv(lead.google_place_id),
      this.escapeCsv(lead.google_maps_url),
      this.escapeCsv(lead.business_category),
      this.escapeCsv(lead.google_rating),
      this.escapeCsv(lead.google_review_count),
      this.escapeCsv(lead.business_status),
      this.escapeCsv(lead.city),
      this.escapeCsv(lead.state_region),
      this.escapeCsv(lead.country),
      this.escapeCsv(lead.address),
      this.escapeCsv(lead.primary_phone),
      this.escapeCsv(lead.international_phone),
      this.escapeCsv(lead.whatsapp_status),
      this.escapeCsv(lead.primary_email),
      this.escapeCsv(lead.official_website),
      this.escapeCsv(lead.website_status),
      this.escapeCsv(lead.website_verification_notes),
      this.escapeCsv(lead.facebook_url),
      this.escapeCsv(lead.instagram_url),
      this.escapeCsv(lead.owner_name),
      this.escapeCsv(lead.decision_maker_role),
      this.escapeCsv(lead.lead_score),
      this.escapeCsv(lead.digital_gap_score),
      this.escapeCsv(lead.digital_gap_label),
      this.escapeCsv(lead.qualification_status),
      this.escapeCsv(lead.confidence_level),
      this.escapeCsv(lead.discovered_at.toISOString()),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }

  /**
   * Export real database leads to JSON format
   */
  static async exportToJson(filters: ExportFilterOptions = {}): Promise<any[]> {
    const where: any = {};
    if (filters.campaignId) where.campaign_id = filters.campaignId;
    if (filters.websiteStatus) where.website_status = filters.websiteStatus;
    if (filters.city) where.city = { contains: filters.city };
    if (filters.digitalGapLabel) where.digital_gap_label = filters.digitalGapLabel;
    if (filters.qualificationStatus) where.qualification_status = filters.qualificationStatus;
    if (filters.minRating) where.google_rating = { gte: filters.minRating };
    if (filters.minReviews) where.google_review_count = { gte: filters.minReviews };

    const leads = await prisma.restaurantLead.findMany({
      where,
      include: {
        sources: true,
        history: true,
      },
      orderBy: { lead_score: "desc" },
    });

    return leads;
  }
}
