export interface EnrichmentInput {
  rawPhone?: string | null;
  rawInternationalPhone?: string | null;
  websiteExtractedEmail?: string | null;
  websiteExtractedSocials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  websiteExtractedOwner?: string | null;
  websiteNotes?: string | null;
}

export interface EnrichedLeadData {
  primaryPhone: string | null;
  secondaryPhone: string | null;
  internationalPhone: string | null;
  whatsappNumber: string | null;
  whatsappStatus: "VERIFIED" | "PROBABLE" | "NOT_FOUND";
  primaryEmail: string | null;
  secondaryEmail: string | null;
  emailConfidence: "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND";
  facebookUrl: string | null;
  instagramUrl: string | null;
  tiktokUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  youtubeUrl: string | null;
  ownerName: string | null;
  founderName: string | null;
  managerName: string | null;
  decisionMakerRole: string | null;
  publicBusinessContact: string | null;
}

export class EnrichmentService {
  /**
   * Enrich lead with strict zero-fabrication rules:
   * Values only populated when discovered from verified public sources.
   */
  static enrich(input: EnrichmentInput): EnrichedLeadData {
    const primaryPhone = input.rawPhone?.trim() || null;
    const internationalPhone = input.rawInternationalPhone?.trim() || null;

    // Email handling: only if discovered from verified site
    const emailCandidate = input.websiteExtractedEmail?.trim() || null;
    let primaryEmail: string | null = null;
    let emailConfidence: "HIGH" | "MEDIUM" | "LOW" | "NOT_FOUND" = "NOT_FOUND";

    if (emailCandidate && emailCandidate.includes("@")) {
      primaryEmail = emailCandidate;
      emailConfidence = "HIGH";
    }

    // WhatsApp handling: only mark verified if explicit public indication exists
    let whatsappStatus: "VERIFIED" | "PROBABLE" | "NOT_FOUND" = "NOT_FOUND";
    let whatsappNumber: string | null = null;
    if (input.websiteNotes?.toLowerCase().includes("whatsapp")) {
      whatsappStatus = "PROBABLE";
      whatsappNumber = internationalPhone || primaryPhone;
    }

    // Socials
    const socials = input.websiteExtractedSocials || {};
    const facebookUrl = socials.facebook?.trim() || null;
    const instagramUrl = socials.instagram?.trim() || null;
    const tiktokUrl = socials.tiktok?.trim() || null;
    const linkedinUrl = socials.linkedin?.trim() || null;
    const twitterUrl = socials.twitter?.trim() || null;
    const youtubeUrl = socials.youtube?.trim() || null;

    // Decision maker
    const ownerName = input.websiteExtractedOwner?.trim() || null;
    const decisionMakerRole = ownerName ? "Owner / General Manager" : null;

    return {
      primaryPhone,
      secondaryPhone: null,
      internationalPhone,
      whatsappNumber,
      whatsappStatus,
      primaryEmail,
      secondaryEmail: null,
      emailConfidence,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      linkedinUrl,
      twitterUrl,
      youtubeUrl,
      ownerName,
      founderName: null,
      managerName: null,
      decisionMakerRole,
      publicBusinessContact: primaryEmail || primaryPhone,
    };
  }
}
