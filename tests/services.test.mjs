import { test, describe, before, after } from "node:test";
import assert from "node:assert";
import { PrismaClient } from "@prisma/client";
import { WebsiteVerificationService } from "../src/lib/services/website-verifier.ts";
import { DeduplicationService } from "../src/lib/services/deduplication.ts";
import { LeadScoringService } from "../src/lib/services/lead-scoring.ts";
import { NaturalLanguageSearchService } from "../src/lib/services/nl-search.ts";
import { GooglePlacesService, GooglePlacesError } from "../src/lib/services/google-places.ts";
import { ExportService } from "../src/lib/services/export.ts";
import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from "../src/lib/auth.ts";

const prisma = new PrismaClient();

describe("1. SSRF Protection & Safe URL Validation", () => {
  test("Blocks localhost and private IP addresses", async () => {
    // Test localhost
    const res1 = await WebsiteVerificationService.verifyRestaurantWebsite("Test", "http://localhost:3000");
    assert.strictEqual(res1.status, "UNKNOWN");
    assert.match(res1.notes, /blocked|forbidden|local/i);

    // Test private IP
    const res2 = await WebsiteVerificationService.verifyRestaurantWebsite("Test", "http://127.0.0.1/admin");
    assert.strictEqual(res2.status, "UNKNOWN");
    assert.match(res2.notes, /blocked|private/i);
  });

  test("Rejects non-HTTP schemes", async () => {
    const res = await WebsiteVerificationService.verifyRestaurantWebsite("Test", "ftp://example.com/menu.pdf");
    assert.strictEqual(res.status, "UNKNOWN");
    assert.match(res.notes, /invalid scheme/i);
  });
});

describe("2. Website Verification & Platform Classification", () => {
  test("Correctly classifies missing website as NO_WEBSITE_VERIFIED", async () => {
    const res = await WebsiteVerificationService.verifyRestaurantWebsite("El Cholo", null);
    assert.strictEqual(res.status, "NO_WEBSITE_VERIFIED");
    assert.strictEqual(res.confidence, "HIGH");
    assert.match(res.notes, /no website uri/i);
  });

  test("Classifies social platform links as SOCIAL_ONLY", async () => {
    const res = await WebsiteVerificationService.verifyRestaurantWebsite(
      "Taco Stand",
      "https://www.instagram.com/tacostandla"
    );
    assert.strictEqual(res.status, "SOCIAL_ONLY");
    assert.strictEqual(res.domain, "instagram.com");
    assert.ok(res.extractedSocials?.instagram);
  });

  test("Classifies marketplace platform links as MARKETPLACE_ONLY", async () => {
    const res = await WebsiteVerificationService.verifyRestaurantWebsite(
      "Pasta Roma",
      "https://www.yelp.com/biz/pasta-roma-los-angeles"
    );
    assert.strictEqual(res.status, "MARKETPLACE_ONLY");
    assert.strictEqual(res.domain, "yelp.com");
    assert.strictEqual(res.officialUrl, null);
  });
});

describe("3. Deduplication Engine", () => {
  test("Normalizes phone numbers across varying US and international formats", () => {
    assert.strictEqual(DeduplicationService.normalizePhone("(310) 555-0199"), "3105550199");
    assert.strictEqual(DeduplicationService.normalizePhone("+1-310-555-0199"), "3105550199");
    assert.strictEqual(DeduplicationService.normalizePhone("310.555.0199"), "3105550199");
  });

  test("Calculates string similarity using Levenshtein distance", () => {
    const simExact = DeduplicationService.stringSimilarity("Guelaguetza Restaurant", "Guelaguetza Restaurant");
    assert.strictEqual(simExact, 1.0);

    const simClose = DeduplicationService.stringSimilarity("Guelaguetza Restaurant", "Guelaguetza Rest.");
    assert.ok(simClose > 0.7);

    const simDiff = DeduplicationService.stringSimilarity("In-N-Out Burger", "Tacos El Gordo");
    assert.ok(simDiff < 0.3);
  });

  test("Calculates Haversine distance between coordinates", () => {
    // Distance between 2 close points in DTLA (~150m)
    const dist = DeduplicationService.calculateDistanceMeters(34.0522, -118.2437, 34.0535, -118.2437);
    assert.ok(dist > 100 && dist < 200, `Expected ~150m, got ${dist}`);
  });
});

describe("4. 100-Point Lead Opportunity Scoring", () => {
  test("Scores high digital gap restaurant (No website + 500 reviews + 4.5 rating + phone)", () => {
    const scoreResult = LeadScoringService.calculateScore({
      websiteStatus: "NO_WEBSITE_VERIFIED", // 30 pts
      reviewCount: 550, // 20 pts
      rating: 4.6, // 10 pts
      businessStatus: "OPERATIONAL", // 10 pts
      hasPhone: true, // 5 pts
      hasEmail: false, // 0 pts
      hasSocial: true, // 5 pts
      hasOwner: false, // 0 pts
      categoryMatch: true, // 5 pts
      sourcesCheckedCount: 2, // 5 pts
    });

    assert.strictEqual(scoreResult.totalScore, 90);
    assert.strictEqual(scoreResult.digitalGapLabel, "HIGH DIGITAL GAP");
    assert.strictEqual(scoreResult.breakdown.websiteGapPoints, 30);
    assert.strictEqual(scoreResult.breakdown.reviewVolumePoints, 20);
  });

  test("Scores low opportunity restaurant with existing official website", () => {
    const scoreResult = LeadScoringService.calculateScore({
      websiteStatus: "HAS_OFFICIAL_WEBSITE", // 0 pts
      reviewCount: 10, // 2 pts
      rating: 3.2, // 3 pts
      businessStatus: "OPERATIONAL", // 10 pts
      hasPhone: true, // 5 pts
      hasEmail: true, // 5 pts
      hasSocial: false, // 0 pts
      hasOwner: false, // 0 pts
      categoryMatch: false, // 0 pts
      sourcesCheckedCount: 1, // 0 pts
    });

    assert.strictEqual(scoreResult.breakdown.websiteGapPoints, 0);
    assert.ok(scoreResult.totalScore < 40);
    assert.strictEqual(scoreResult.digitalGapLabel, "LOW DIGITAL GAP");
  });
});

describe("5. Natural Language Query Translation", () => {
  test("Translates complex natural language query to structured database conditions", () => {
    const query = "Show me Mexican restaurants in Los Angeles with more than 500 reviews and no official website";
    const parsed = NaturalLanguageSearchService.parseQuery(query);

    assert.strictEqual(parsed.category, "Mexican");
    assert.strictEqual(parsed.city, "Los Angeles");
    assert.strictEqual(parsed.minReviews, 500);
    assert.strictEqual(parsed.websiteRequirement, "NO_OFFICIAL_WEBSITE");
    assert.ok(parsed.rawExplanation.includes("Minimum reviews: 500"));
  });

  test("Parses rating and city in query", () => {
    const query = "Italian restaurants in Chicago with rating above 4.0";
    const parsed = NaturalLanguageSearchService.parseQuery(query);

    assert.strictEqual(parsed.category, "Italian");
    assert.strictEqual(parsed.city, "Chicago");
    assert.strictEqual(parsed.minRating, 4.0);
  });
});

describe("6. Google Places API Service & Zero-Mock Policy", () => {
  test("Throws MISSING_API_KEY error when key is unconfigured rather than returning fake data", async () => {
    const originalKey = process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.GOOGLE_MAPS_API_KEY;

    try {
      await GooglePlacesService.searchPlaces({ textQuery: "restaurants in Los Angeles" });
      assert.fail("Should have thrown GooglePlacesError");
    } catch (err) {
      assert.ok(err instanceof GooglePlacesError);
      assert.strictEqual(err.errorType, "MISSING_API_KEY");
      assert.match(err.message, /Google Maps API key is not configured/i);
    } finally {
      if (originalKey) process.env.GOOGLE_MAPS_API_KEY = originalKey;
    }
  });
});

describe("7. Production Authentication & Security", () => {
  test("Hashes and verifies passwords securely using bcrypt", async () => {
    const password = "Secr3tPassword!2026";
    const hash = await hashPassword(password);

    assert.notStrictEqual(hash, password);
    const valid = await verifyPassword(password, hash);
    assert.strictEqual(valid, true);

    const invalid = await verifyPassword("WrongPassword", hash);
    assert.strictEqual(invalid, false);
  });

  test("Issues and cryptographically validates JWT session tokens", async () => {
    const user = {
      id: "test-user-123",
      email: "researcher@example.com",
      name: "Lead Researcher",
      role: "RESEARCHER",
    };

    const token = await createSessionToken(user);
    assert.ok(token && typeof token === "string");

    const decoded = await verifySessionToken(token);
    assert.ok(decoded);
    assert.strictEqual(decoded.id, user.id);
    assert.strictEqual(decoded.email, user.email);
    assert.strictEqual(decoded.role, user.role);
  });
});

describe("8. Database Persistence & Relations", () => {
  let createdCampaignId;
  let createdLeadId;

  const uniquePlaceId = `ChIJ_test_place_id_${Date.now()}`;

  before(async () => {
    // Clean up any old test records
    await prisma.restaurantLead.deleteMany({
      where: { google_place_id: { startsWith: "ChIJ_test_place_id_" } },
    });
    await prisma.campaign.deleteMany({
      where: { campaign_name: "Test Audit Campaign" },
    });

    // Create real test campaign
    const campaign = await prisma.campaign.create({
      data: {
        campaign_name: "Test Audit Campaign",
        target_lead_count: 50,
        minimum_rating: 4.0,
        minimum_review_count: 100,
        business_categories: "mexican",
        website_requirement: "NO_OFFICIAL_WEBSITE",
        status: "DRAFT",
        locations: {
          create: {
            country: "United States",
            country_code: "US",
            city: "San Diego",
            location_mode: "CITY",
            location_display_name: "San Diego, CA, US",
            location_query: "San Diego, California, United States",
          },
        },
      },
    });
    createdCampaignId = campaign.id;

    // Create real lead record
    const lead = await prisma.restaurantLead.create({
      data: {
        campaign_id: campaign.id,
        restaurant_name: "La Puerta Cantina",
        google_place_id: uniquePlaceId,
        google_maps_url: `https://maps.google.com/?q=place_id:${uniquePlaceId}`,
        business_category: "mexican restaurant",
        google_rating: 4.7,
        google_review_count: 1240,
        business_status: "OPERATIONAL",
        country: "United States",
        city: "San Diego",
        address: "560 4th Ave, San Diego, CA 92101",
        primary_phone: "(619) 696-3466",
        international_phone: "+1 619-696-3466",
        website_status: "NO_WEBSITE_VERIFIED",
        website_verification_notes: "No official website found on Google listing.",
        lead_score: 90,
        digital_gap_score: 90,
        digital_gap_label: "HIGH DIGITAL GAP",
        qualification_status: "QUALIFIED",
        verification_status: "VERIFIED",
        confidence_level: "HIGH",
      },
    });
    createdLeadId = lead.id;
  });

  after(async () => {
    if (createdCampaignId) {
      await prisma.campaign.delete({ where: { id: createdCampaignId } });
    }
    await prisma.$disconnect();
  });

  test("Persists campaign and location relations in SQLite database", async () => {
    const fetched = await prisma.campaign.findUnique({
      where: { id: createdCampaignId },
      include: { locations: true, leads: true },
    });

    assert.ok(fetched);
    assert.strictEqual(fetched.campaign_name, "Test Audit Campaign");
    assert.strictEqual(fetched.locations.length, 1);
    assert.strictEqual(fetched.locations[0].city, "San Diego");
    assert.strictEqual(fetched.leads.length, 1);
  });

  test("Exports real database records to CSV format adhering to RFC 4180", async () => {
    const csv = await ExportService.exportToCsv({ campaignId: createdCampaignId });
    assert.ok(csv.includes("La Puerta Cantina"));
    assert.ok(csv.includes(uniquePlaceId));
    assert.ok(csv.includes("NO_WEBSITE_VERIFIED"));
    assert.ok(csv.includes("HIGH DIGITAL GAP"));
  });

  test("Exports real database records to JSON format", async () => {
    const json = await ExportService.exportToJson({ campaignId: createdCampaignId });
    assert.strictEqual(json.length, 1);
    assert.strictEqual(json[0].restaurant_name, "La Puerta Cantina");
    assert.strictEqual(json[0].google_rating, 4.7);
  });
});
