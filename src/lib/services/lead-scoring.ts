export interface LeadScoringInput {
  websiteStatus: string;
  rating?: number | null;
  reviewCount?: number | null;
  businessStatus?: string | null;
  hasPhone: boolean;
  hasEmail: boolean;
  hasSocial: boolean;
  hasOwner: boolean;
  categoryMatch: boolean;
  sourcesCheckedCount: number;
}

export interface LeadScoreResult {
  totalScore: number;
  digitalGapScore: number;
  digitalGapLabel: "HIGH DIGITAL GAP" | "MEDIUM DIGITAL GAP" | "LOW DIGITAL GAP";
  breakdown: {
    websiteGapPoints: number; // max 30
    reviewVolumePoints: number; // max 20
    ratingPoints: number; // max 10
    activeBusinessPoints: number; // max 10
    phonePoints: number; // max 5
    emailPoints: number; // max 5
    socialPoints: number; // max 5
    ownerPoints: number; // max 5
    categoryMatchPoints: number; // max 5
    multiSourcePoints: number; // max 5
  };
}

export class LeadScoringService {
  static calculateScore(input: LeadScoringInput): LeadScoreResult {
    let websiteGapPoints = 0;
    switch (input.websiteStatus) {
      case "NO_WEBSITE_VERIFIED":
        websiteGapPoints = 30;
        break;
      case "NO_WEBSITE_PROBABLE":
        websiteGapPoints = 25;
        break;
      case "SOCIAL_ONLY":
        websiteGapPoints = 20;
        break;
      case "MARKETPLACE_ONLY":
        websiteGapPoints = 15;
        break;
      case "UNKNOWN":
        websiteGapPoints = 10;
        break;
      case "HAS_OFFICIAL_WEBSITE":
      default:
        websiteGapPoints = 0;
        break;
    }

    let reviewVolumePoints = 0;
    const reviews = input.reviewCount || 0;
    if (reviews >= 500) reviewVolumePoints = 20;
    else if (reviews >= 200) reviewVolumePoints = 15;
    else if (reviews >= 100) reviewVolumePoints = 10;
    else if (reviews >= 30) reviewVolumePoints = 5;
    else if (reviews > 0) reviewVolumePoints = 2;

    let ratingPoints = 0;
    const rating = input.rating || 0;
    if (rating >= 4.5) ratingPoints = 10;
    else if (rating >= 4.0) ratingPoints = 7;
    else if (rating >= 3.5) ratingPoints = 5;
    else if (rating >= 3.0) ratingPoints = 3;

    let activeBusinessPoints = 0;
    if (input.businessStatus === "OPERATIONAL" || input.businessStatus === "Operating") {
      activeBusinessPoints = 10;
    }

    const phonePoints = input.hasPhone ? 5 : 0;
    const emailPoints = input.hasEmail ? 5 : 0;
    const socialPoints = input.hasSocial ? 5 : 0;
    const ownerPoints = input.hasOwner ? 5 : 0;
    const categoryMatchPoints = input.categoryMatch ? 5 : 0;
    const multiSourcePoints = input.sourcesCheckedCount >= 2 ? 5 : 0;

    const totalScore =
      websiteGapPoints +
      reviewVolumePoints +
      ratingPoints +
      activeBusinessPoints +
      phonePoints +
      emailPoints +
      socialPoints +
      ownerPoints +
      categoryMatchPoints +
      multiSourcePoints;

    // Digital gap score is directly proportional to how much digital opportunity exists
    const digitalGapScore = Math.min(100, Math.max(0, totalScore));

    let digitalGapLabel: "HIGH DIGITAL GAP" | "MEDIUM DIGITAL GAP" | "LOW DIGITAL GAP" = "LOW DIGITAL GAP";
    if (digitalGapScore >= 65) {
      digitalGapLabel = "HIGH DIGITAL GAP";
    } else if (digitalGapScore >= 40) {
      digitalGapLabel = "MEDIUM DIGITAL GAP";
    }

    return {
      totalScore,
      digitalGapScore,
      digitalGapLabel,
      breakdown: {
        websiteGapPoints,
        reviewVolumePoints,
        ratingPoints,
        activeBusinessPoints,
        phonePoints,
        emailPoints,
        socialPoints,
        ownerPoints,
        categoryMatchPoints,
        multiSourcePoints,
      },
    };
  }
}
