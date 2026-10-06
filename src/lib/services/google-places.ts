import { prisma } from "../prisma";
import { getApiKey } from "../config";

export interface GooglePlaceCandidate {
  id: string; // Google Place ID
  displayName?: {
    text: string;
    languageCode?: string;
  };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | string;
  location?: {
    latitude: number;
    longitude: number;
  };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  types?: string[];
  googleMapsUri?: string;
}

export interface GooglePlacesSearchOptions {
  textQuery: string;
  pageSize?: number; // 1-20 per page for Google Places API (New)
  pageToken?: string;
  locationBias?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number; // in meters
    };
  };
  locationRestriction?: {
    circle?: {
      center: { latitude: number; longitude: number };
      radius: number; // in meters
    };
  };
  minRating?: number;
  openNow?: boolean;
}

export interface GooglePlacesSearchResponse {
  places: GooglePlaceCandidate[];
  nextPageToken?: string;
  rawCount: number;
}

export class GooglePlacesError extends Error {
  statusCode?: number;
  errorType:
    | "MISSING_API_KEY"
    | "AUTHENTICATION_FAILED"
    | "QUOTA_EXCEEDED"
    | "RATE_LIMIT"
    | "BAD_REQUEST"
    | "SERVICE_UNAVAILABLE"
    | "NETWORK_ERROR";
  rawError?: unknown;

  constructor(
    message: string,
    errorType: GooglePlacesError["errorType"],
    statusCode?: number,
    rawError?: unknown
  ) {
    super(message);
    this.name = "GooglePlacesError";
    this.errorType = errorType;
    this.statusCode = statusCode;
    this.rawError = rawError;
  }
}

export class GooglePlacesService {
  private static FIELD_MASK = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
    "places.location",
    "places.websiteUri",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.types",
    "places.googleMapsUri",
    "nextPageToken",
  ].join(",");

  /**
   * Search places using the Google Places API (New) text search endpoint
   */
  static async searchPlaces(options: GooglePlacesSearchOptions): Promise<GooglePlacesSearchResponse> {
    const apiKey = await getApiKey("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      throw new GooglePlacesError(
        "Google Maps API key is not configured. Please add it in Settings or set GOOGLE_MAPS_API_KEY in your environment.",
        "MISSING_API_KEY"
      );
    }

    const startTime = Date.now();
    const endpoint = "https://places.googleapis.com/v1/places:searchText";

    const requestBody: Record<string, unknown> = {
      textQuery: options.textQuery,
      pageSize: options.pageSize || 20,
    };

    if (options.pageToken) {
      requestBody.pageToken = options.pageToken;
    }

    if (options.minRating) {
      requestBody.minRating = options.minRating;
    }

    if (options.locationBias) {
      requestBody.locationBias = options.locationBias;
    }

    if (options.locationRestriction) {
      requestBody.locationRestriction = options.locationRestriction;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": this.FIELD_MASK,
        },
        body: JSON.stringify(requestBody),
      });

      const durationMs = Date.now() - startTime;
      const data = await response.json();

      // Log API call to database audit log
      await prisma.apiAuditLog.create({
        data: {
          service_name: "GOOGLE_PLACES",
          endpoint: "places:searchText",
          status_code: response.status,
          request_summary: JSON.stringify({
            query: options.textQuery,
            pageSize: options.pageSize,
            hasPageToken: !!options.pageToken,
          }),
          response_summary: response.ok
            ? `Found ${data.places?.length || 0} places`
            : `Error: ${data.error?.message || "Unknown error"}`,
          error_message: response.ok ? null : JSON.stringify(data.error),
          duration_ms: durationMs,
        },
      });

      if (!response.ok) {
        const errorMsg = data.error?.message || "Google Places API request failed";
        const status = response.status;

        if (status === 401 || status === 403) {
          throw new GooglePlacesError(
            `Google Places API authentication error: ${errorMsg}. Please verify your API key, billing account, and enabled APIs.`,
            "AUTHENTICATION_FAILED",
            status,
            data
          );
        } else if (status === 429) {
          throw new GooglePlacesError(
            `Google Places API rate limit or quota exceeded: ${errorMsg}`,
            "RATE_LIMIT",
            status,
            data
          );
        } else if (status >= 500) {
          throw new GooglePlacesError(
            `Google Places API service temporarily unavailable (${status}): ${errorMsg}`,
            "SERVICE_UNAVAILABLE",
            status,
            data
          );
        } else {
          throw new GooglePlacesError(
            `Google Places API error (${status}): ${errorMsg}`,
            "BAD_REQUEST",
            status,
            data
          );
        }
      }

      const places: GooglePlaceCandidate[] = (data.places || []).map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        formattedAddress: p.formattedAddress,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
        businessStatus: p.businessStatus,
        location: p.location,
        websiteUri: p.websiteUri,
        nationalPhoneNumber: p.nationalPhoneNumber,
        internationalPhoneNumber: p.internationalPhoneNumber,
        types: p.types,
        googleMapsUri: p.googleMapsUri,
      }));

      return {
        places,
        nextPageToken: data.nextPageToken,
        rawCount: places.length,
      };
    } catch (err: any) {
      if (err instanceof GooglePlacesError) {
        throw err;
      }
      // Network or fetch connection failure
      const durationMs = Date.now() - startTime;
      await prisma.apiAuditLog.create({
        data: {
          service_name: "GOOGLE_PLACES",
          endpoint: "places:searchText",
          status_code: 0,
          request_summary: JSON.stringify({ query: options.textQuery }),
          error_message: err.message || "Network request failed",
          duration_ms: durationMs,
        },
      });
      throw new GooglePlacesError(
        `Failed to reach Google Places API: ${err.message}`,
        "NETWORK_ERROR",
        undefined,
        err
      );
    }
  }

  /**
   * Fetch details for a specific Place ID
   */
  static async getPlaceDetails(placeId: string): Promise<GooglePlaceCandidate> {
    const apiKey = await getApiKey("GOOGLE_MAPS_API_KEY");

    if (!apiKey) {
      throw new GooglePlacesError(
        "Google Maps API key is not configured.",
        "MISSING_API_KEY"
      );
    }

    const startTime = Date.now();
    const endpoint = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;

    const singleFieldMask = [
      "id",
      "displayName",
      "formattedAddress",
      "rating",
      "userRatingCount",
      "businessStatus",
      "location",
      "websiteUri",
      "nationalPhoneNumber",
      "internationalPhoneNumber",
      "types",
      "googleMapsUri",
    ].join(",");

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": singleFieldMask,
        },
      });

      const durationMs = Date.now() - startTime;
      const data = await response.json();

      await prisma.apiAuditLog.create({
        data: {
          service_name: "GOOGLE_PLACES",
          endpoint: `places/${placeId}`,
          status_code: response.status,
          request_summary: `Place Details for ${placeId}`,
          response_summary: response.ok ? `Success` : data.error?.message,
          error_message: response.ok ? null : JSON.stringify(data.error),
          duration_ms: durationMs,
        },
      });

      if (!response.ok) {
        throw new GooglePlacesError(
          data.error?.message || "Failed to fetch place details",
          response.status === 401 || response.status === 403
            ? "AUTHENTICATION_FAILED"
            : "BAD_REQUEST",
          response.status,
          data
        );
      }

      return {
        id: data.id,
        displayName: data.displayName,
        formattedAddress: data.formattedAddress,
        rating: data.rating,
        userRatingCount: data.userRatingCount,
        businessStatus: data.businessStatus,
        location: data.location,
        websiteUri: data.websiteUri,
        nationalPhoneNumber: data.nationalPhoneNumber,
        internationalPhoneNumber: data.internationalPhoneNumber,
        types: data.types,
        googleMapsUri: data.googleMapsUri,
      };
    } catch (err: any) {
      if (err instanceof GooglePlacesError) throw err;
      throw new GooglePlacesError(
        `Failed to reach Google Places API: ${err.message}`,
        "NETWORK_ERROR",
        undefined,
        err
      );
    }
  }

  /**
   * Validate if a key is working by making a minimal test call
   */
  static async testConnection(keyOverride?: string): Promise<{
    valid: boolean;
    message: string;
    latencyMs?: number;
  }> {
    const key = keyOverride || (await getApiKey("GOOGLE_MAPS_API_KEY"));
    if (!key) {
      return {
        valid: false,
        message: "No Google Maps API key provided or configured.",
      };
    }

    const startTime = Date.now();
    try {
      const endpoint = "https://places.googleapis.com/v1/places:searchText";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.id",
        },
        body: JSON.stringify({
          textQuery: "restaurant",
          pageSize: 1,
        }),
      });

      const latencyMs = Date.now() - startTime;
      const data = await response.json();

      if (response.ok) {
        return {
          valid: true,
          message: "Google Places API connected successfully.",
          latencyMs,
        };
      }

      const msg = data.error?.message || `HTTP ${response.status}`;
      return {
        valid: false,
        message: `Google API rejected the request: ${msg}`,
        latencyMs,
      };
    } catch (err: any) {
      return {
        valid: false,
        message: `Network error connecting to Google Places: ${err.message}`,
      };
    }
  }
}
