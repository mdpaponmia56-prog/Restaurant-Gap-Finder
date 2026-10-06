import { prisma } from "../prisma";

export interface DuplicateCheckCandidate {
  googlePlaceId: string;
  name: string;
  phone?: string | null;
  domain?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchedLeadId?: string;
  matchType?: "GOOGLE_PLACE_ID" | "PHONE" | "DOMAIN" | "GEO_NAME";
  reason?: string;
}

export class DeduplicationService {
  /**
   * Normalize phone number to digits only for reliable matching
   */
  static normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    // If US number with leading 1 and 11 digits, strip leading 1
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.slice(1);
    }
    return digits.length >= 7 ? digits : null;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  static stringSimilarity(s1: string, s2: string): number {
    const a = s1.toLowerCase().trim();
    const b = s2.toLowerCase().trim();
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    const distance = matrix[b.length][a.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  /**
   * Distance between two coordinates in meters (Haversine formula)
   */
  static calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if candidate is duplicate of existing database record
   */
  static async findDuplicate(candidate: DuplicateCheckCandidate): Promise<DuplicateCheckResult> {
    // 1. Google Place ID exact match
    const placeIdMatch = await prisma.restaurantLead.findUnique({
      where: { google_place_id: candidate.googlePlaceId },
      select: { id: true, restaurant_name: true },
    });

    if (placeIdMatch) {
      return {
        isDuplicate: true,
        matchedLeadId: placeIdMatch.id,
        matchType: "GOOGLE_PLACE_ID",
        reason: `Matched existing lead "${placeIdMatch.restaurant_name}" by unique Google Place ID`,
      };
    }

    // 2. Phone match
    const normPhone = this.normalizePhone(candidate.phone);
    if (normPhone) {
      const allWithPhone = await prisma.restaurantLead.findMany({
        where: {
          OR: [
            { primary_phone: { not: null } },
            { international_phone: { not: null } },
          ],
        },
        select: { id: true, restaurant_name: true, primary_phone: true, international_phone: true },
        take: 200,
      });

      for (const lead of allWithPhone) {
        if (
          this.normalizePhone(lead.primary_phone) === normPhone ||
          this.normalizePhone(lead.international_phone) === normPhone
        ) {
          // If name is also similar (>0.6) or exactly same, it's a duplicate
          const sim = this.stringSimilarity(candidate.name, lead.restaurant_name);
          if (sim > 0.5) {
            return {
              isDuplicate: true,
              matchedLeadId: lead.id,
              matchType: "PHONE",
              reason: `Matched existing lead "${lead.restaurant_name}" by telephone number & name similarity (${Math.round(sim * 100)}%)`,
            };
          }
        }
      }
    }

    // 3. Coordinate proximity + Name similarity
    if (candidate.latitude && candidate.longitude) {
      const nearbyLeads = await prisma.restaurantLead.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
        },
        select: { id: true, restaurant_name: true, latitude: true, longitude: true },
        take: 100,
      });

      for (const lead of nearbyLeads) {
        if (lead.latitude && lead.longitude) {
          const dist = this.calculateDistanceMeters(
            candidate.latitude,
            candidate.longitude,
            lead.latitude,
            lead.longitude
          );
          if (dist < 40) {
            // Under 40 meters
            const sim = this.stringSimilarity(candidate.name, lead.restaurant_name);
            if (sim > 0.7) {
              return {
                isDuplicate: true,
                matchedLeadId: lead.id,
                matchType: "GEO_NAME",
                reason: `Matched existing lead "${lead.restaurant_name}" by exact geolocation (<40m) and name similarity`,
              };
            }
          }
        }
      }
    }

    return { isDuplicate: false };
  }
}
