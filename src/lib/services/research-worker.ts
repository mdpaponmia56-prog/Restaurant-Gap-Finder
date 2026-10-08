import { prisma } from "../prisma";
import { GooglePlacesService, GooglePlacesError } from "./google-places";
import { WebsiteVerificationService } from "./website-verifier";
import { LeadScoringService } from "./lead-scoring";
import { DeduplicationService } from "./deduplication";
import { EnrichmentService } from "./enrichment";

// In-memory registry of active background abort controllers to allow instantaneous cancellation
const activeJobControllers = new Map<string, AbortController>();

/**
 * Retries transient database errors (e.g. pooler reconnection, packet drops) with exponential backoff.
 */
export async function withDbRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelayMs = 1000): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isConnectionError =
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes("Connection refused") ||
        err?.message?.includes("Connection closed") ||
        err?.message?.includes("connection timeout") ||
        err?.message?.includes("timed out") ||
        err?.message?.includes("terminating connection") ||
        err?.message?.includes("closed unexpectedly") ||
        err?.message?.includes("server closed the connection");

      if (isConnectionError && attempt < maxRetries) {
        console.warn(`Transient database error, retrying attempt ${attempt}/${maxRetries} in ${baseDelayMs * attempt}ms...`, err?.message);
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

export class ResearchWorkerService {
  /**
   * Start a research job in the background
   */
  static async startJob(jobId: string): Promise<void> {
    const job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      include: {
        campaign: {
          include: { locations: true },
        },
      },
    });

    if (!job) {
      throw new Error(`Research job ${jobId} not found.`);
    }

    if (job.status === "RUNNING") {
      return; // Already running
    }

    // Set status to RUNNING
    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: "RUNNING",
        started_at: job.started_at || new Date(),
        current_stage: "DISCOVERING",
        error_message: null,
      },
    });

    await prisma.campaign.update({
      where: { id: job.campaign_id },
      data: {
        status: "RUNNING",
        started_at: job.campaign.started_at || new Date(),
      },
    });

    const controller = new AbortController();
    activeJobControllers.set(jobId, controller);

    // Launch background execution asynchronously without blocking caller
    setImmediate(async () => {
      try {
        await this.executeJobLoop(jobId, controller.signal);
      } catch (err: any) {
        console.error(`Research worker error on job ${jobId}:`, err);
        const errorMsg =
          err instanceof GooglePlacesError ? err.message : err.message || "An unexpected error occurred during research.";

        await prisma.researchJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            error_message: errorMsg,
            current_stage: "FAILED",
          },
        });

        await prisma.campaign.update({
          where: { id: job.campaign_id },
          data: { status: "FAILED" },
        });
      } finally {
        activeJobControllers.delete(jobId);
      }
    });
  }

  /**
   * Pause a research job
   */
  static async pauseJob(jobId: string): Promise<void> {
    const controller = activeJobControllers.get(jobId);
    if (controller) {
      controller.abort();
      activeJobControllers.delete(jobId);
    }

    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: "PAUSED",
        current_stage: "PAUSED",
      },
    });

    const job = await prisma.researchJob.findUnique({ where: { id: jobId } });
    if (job) {
      await prisma.campaign.update({
        where: { id: job.campaign_id },
        data: { status: "PAUSED" },
      });
    }
  }

  /**
   * Resume a paused research job
   */
  static async resumeJob(jobId: string): Promise<void> {
    const job = await prisma.researchJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");
    if (job.status !== "PAUSED" && job.status !== "FAILED") {
      throw new Error(`Cannot resume job with status "${job.status}"`);
    }

    await this.startJob(jobId);
  }

  /**
   * Cancel a research job
   */
  static async cancelJob(jobId: string): Promise<void> {
    const controller = activeJobControllers.get(jobId);
    if (controller) {
      controller.abort();
      activeJobControllers.delete(jobId);
    }

    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: "CANCELLED",
        current_stage: "CANCELLED",
        completed_at: new Date(),
      },
    });

    const job = await prisma.researchJob.findUnique({ where: { id: jobId } });
    if (job) {
      await prisma.campaign.update({
        where: { id: job.campaign_id },
        data: { status: "CANCELLED" },
      });
    }
  }

  /**
   * Core execution loop of the research worker
   */
  private static async executeJobLoop(jobId: string, signal: AbortSignal): Promise<void> {
    let job = await prisma.researchJob.findUnique({
      where: { id: jobId },
      include: {
        campaign: {
          include: { locations: true },
        },
      },
    });

    if (!job) return;

    const campaign = job.campaign;
    const locations = campaign.locations.length > 0 ? campaign.locations : [];

    if (locations.length === 0) {
      throw new Error("Campaign has no locations specified. Please configure at least one location.");
    }

    const targetLeadCount = campaign.target_lead_count;
    let totalDiscovered = job.total_discovered;
    let totalQualified = job.total_qualified;
    let totalRejected = job.total_rejected;
    let totalNeedsReview = job.total_needs_review;
    let totalDuplicates = job.total_duplicates;
    let apiRequestsCount = job.api_requests;

    // Iterate through configured locations
    for (const location of locations) {
      if (signal.aborted) break;

      // Check current DB status to respect Pause/Cancel requests
      const currentJobState = await prisma.researchJob.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (currentJobState?.status !== "RUNNING") {
        return; // Interrupted or cancelled
      }

      // Update location under research
      await prisma.researchJob.update({
        where: { id: jobId },
        data: {
          current_location_id: location.id,
          current_stage: "DISCOVERING",
        },
      });

      // Construct search queries for this location
      // Using business categories and location query
      const categories = campaign.business_categories.split(",").map((c) => c.trim());
      const baseCategory = categories[0] || "restaurants";
      const locationText = location.location_query || `${location.city}, ${location.country}`;
      const searchQueries = [
        `${baseCategory} in ${locationText}`,
        `local ${baseCategory} ${locationText}`,
        `popular dining ${locationText}`,
      ];

      for (const query of searchQueries) {
        if (signal.aborted || totalQualified >= targetLeadCount) break;

        await prisma.researchJob.update({
          where: { id: jobId },
          data: {
            current_search_query: query,
            current_stage: "DISCOVERING",
          },
        });

        let nextPageToken: string | undefined = undefined;
        let pagesCount = 0;
        const maxPages = 3; // up to 60 candidates per search query

        do {
          if (signal.aborted || totalQualified >= targetLeadCount) break;

          // Double check DB status
          const checkStatus = await prisma.researchJob.findUnique({
            where: { id: jobId },
            select: { status: true },
          });
          if (checkStatus?.status !== "RUNNING") return;

          // Call Google Places API (New)
          apiRequestsCount++;
          const searchResponse = await GooglePlacesService.searchPlaces({
            textQuery: query,
            pageToken: nextPageToken,
            pageSize: 20,
            minRating: campaign.minimum_rating > 0 ? campaign.minimum_rating : undefined,
          });

          const candidates = searchResponse.places;
          totalDiscovered += candidates.length;

          // Update discovery count
          await prisma.researchJob.update({
            where: { id: jobId },
            data: {
              total_discovered: totalDiscovered,
              api_requests: apiRequestsCount,
              current_stage: "PROCESSING_CANDIDATES",
            },
          });

          // Process each candidate through the pipeline
          let candidateIdx = 0;
          for (const candidate of candidates) {
            candidateIdx++;
            if (signal.aborted || totalQualified >= targetLeadCount) break;

            if (candidateIdx % 5 === 1) {
              const checkState = await withDbRetry(() =>
                prisma.researchJob.findUnique({
                  where: { id: jobId },
                  select: { status: true },
                })
              );
              if (checkState?.status !== "RUNNING") return;
            }

            // 1. FILTERING: Check rating and review count
            const rating = candidate.rating ?? 0;
            const reviewCount = candidate.userRatingCount ?? 0;

            if (rating < campaign.minimum_rating) {
              totalRejected++;
              continue;
            }

            if (reviewCount < campaign.minimum_review_count) {
              totalRejected++;
              continue;
            }

            // Check business status
            if (
              candidate.businessStatus &&
              candidate.businessStatus !== "OPERATIONAL" &&
              candidate.businessStatus !== "Operating"
            ) {
              totalRejected++;
              continue;
            }

            // 2. DEDUPLICATION: check against database
            const candidateName = candidate.displayName?.text || "Unknown Restaurant";
            const dupCheck = await DeduplicationService.findDuplicate({
              googlePlaceId: candidate.id,
              name: candidateName,
              phone: candidate.internationalPhoneNumber || candidate.nationalPhoneNumber,
              latitude: candidate.location?.latitude,
              longitude: candidate.location?.longitude,
              address: candidate.formattedAddress,
            });

            if (dupCheck.isDuplicate) {
              totalDuplicates++;
              continue;
            }

            // 3. WEBSITE VERIFICATION: real probe of website
            await prisma.researchJob.update({
              where: { id: jobId },
              data: { current_stage: `VERIFYING: ${candidateName.slice(0, 30)}` },
            });

            const webVerification = await WebsiteVerificationService.verifyRestaurantWebsite(
              candidateName,
              candidate.websiteUri,
              candidate.formattedAddress
            );

            // Check website requirement criteria
            let qualifiesWebsite = false;
            let rejectionReason: string | null = null;

            if (campaign.website_requirement === "NO_OFFICIAL_WEBSITE") {
              if (
                webVerification.status === "NO_WEBSITE_VERIFIED" ||
                webVerification.status === "NO_WEBSITE_PROBABLE" ||
                webVerification.status === "SOCIAL_ONLY" ||
                webVerification.status === "MARKETPLACE_ONLY"
              ) {
                qualifiesWebsite = true;
              } else if (webVerification.status === "UNKNOWN") {
                qualifiesWebsite = true;
                totalNeedsReview++;
              } else {
                qualifiesWebsite = false;
                rejectionReason = "HAS_OFFICIAL_WEBSITE";
              }
            } else if (campaign.website_requirement === "HAS_WEBSITE") {
              qualifiesWebsite = webVerification.status === "HAS_OFFICIAL_WEBSITE";
              if (!qualifiesWebsite) rejectionReason = "NO_OFFICIAL_WEBSITE";
            } else {
              // ANY
              qualifiesWebsite = true;
            }

            if (!qualifiesWebsite) {
              totalRejected++;
              continue;
            }

            // 4. ENRICHMENT
            const enriched = EnrichmentService.enrich({
              rawPhone: candidate.nationalPhoneNumber,
              rawInternationalPhone: candidate.internationalPhoneNumber,
              websiteExtractedEmail: webVerification.extractedEmail,
              websiteExtractedSocials: webVerification.extractedSocials,
              websiteExtractedOwner: webVerification.extractedOwner,
              websiteNotes: webVerification.notes,
            });

            // 5. SCORING
            const scoring = LeadScoringService.calculateScore({
              websiteStatus: webVerification.status,
              rating: candidate.rating,
              reviewCount: candidate.userRatingCount,
              businessStatus: candidate.businessStatus,
              hasPhone: !!(enriched.primaryPhone || enriched.internationalPhone),
              hasEmail: !!enriched.primaryEmail,
              hasSocial: !!(
                enriched.facebookUrl ||
                enriched.instagramUrl ||
                enriched.tiktokUrl ||
                enriched.twitterUrl ||
                enriched.linkedinUrl
              ),
              hasOwner: !!enriched.ownerName,
              categoryMatch: true,
              sourcesCheckedCount: candidate.websiteUri ? 2 : 1,
            });

            // 6. SAVE TO DATABASE
            const newLead = await withDbRetry(() =>
              prisma.restaurantLead.create({
                data: {
                  campaign_id: campaign.id,
                  restaurant_name: candidateName,
                  google_place_id: candidate.id,
                  google_maps_url:
                    candidate.googleMapsUri ||
                    `https://www.google.com/maps/place/?q=place_id:${candidate.id}`,
                  business_category: candidate.types?.[0] || baseCategory,
                  google_rating: candidate.rating,
                  google_review_count: candidate.userRatingCount || 0,
                  business_status: candidate.businessStatus || "OPERATIONAL",
                  country: location.country,
                  country_code: location.country_code,
                  state_region: location.state_region,
                  state_region_code: location.state_region_code,
                  city: location.city,
                  neighborhood: location.neighborhood,
                  postal_code: location.postal_code,
                  address: candidate.formattedAddress,
                  latitude: candidate.location?.latitude,
                  longitude: candidate.location?.longitude,
                  primary_phone: enriched.primaryPhone,
                  international_phone: enriched.internationalPhone,
                  whatsapp_number: enriched.whatsappNumber,
                  whatsapp_status: enriched.whatsappStatus,
                  primary_email: enriched.primaryEmail,
                  email_confidence: enriched.emailConfidence,
                  official_website: webVerification.officialUrl,
                  website_domain: webVerification.domain,
                  website_status: webVerification.status,
                  website_verification_notes: webVerification.notes,
                  facebook_url: enriched.facebookUrl,
                  instagram_url: enriched.instagramUrl,
                  tiktok_url: enriched.tiktokUrl,
                  linkedin_url: enriched.linkedinUrl,
                  twitter_url: enriched.twitterUrl,
                  youtube_url: enriched.youtubeUrl,
                  owner_name: enriched.ownerName,
                  decision_maker_role: enriched.decisionMakerRole,
                  public_business_contact: enriched.publicBusinessContact,
                  lead_score: scoring.totalScore,
                  digital_gap_score: scoring.digitalGapScore,
                  digital_gap_label: scoring.digitalGapLabel,
                  qualification_status:
                    webVerification.status === "UNKNOWN" ? "NEEDS_REVIEW" : "QUALIFIED",
                  verification_status: "VERIFIED",
                  confidence_level: webVerification.confidence,
                  rejection_reason: rejectionReason,
                  source_urls: JSON.stringify(
                    [
                      candidate.googleMapsUri,
                      webVerification.officialUrl,
                      enriched.facebookUrl,
                      enriched.instagramUrl,
                    ].filter(Boolean)
                  ),
                  sources_checked: JSON.stringify(["GOOGLE_PLACES", "WEBSITE_AUDIT"]),
                  last_verified_at: new Date(),
                },
              })
            );

            // Create Google Places LeadSource
            await withDbRetry(() =>
              prisma.leadSource.create({
              data: {
                restaurant_lead_id: newLead.id,
                source_type: "GOOGLE_PLACES",
                source_name: "Google Places API (New)",
                source_url: candidate.googleMapsUri || `https://maps.google.com/?q=place_id:${candidate.id}`,
                information_found: JSON.stringify({
                  rating: candidate.rating,
                  reviewCount: candidate.userRatingCount,
                  address: candidate.formattedAddress,
                  status: candidate.businessStatus,
                }),
                confidence: "HIGH",
              },
            }));

            // Create Website LeadSource if checked
            if (candidate.websiteUri) {
              await prisma.leadSource.create({
                data: {
                  restaurant_lead_id: newLead.id,
                  source_type: "OFFICIAL_WEBSITE",
                  source_name: "Direct Website Verification",
                  source_url: candidate.websiteUri,
                  information_found: webVerification.notes,
                  confidence: webVerification.confidence,
                },
              });
            }

            totalQualified++;

            // Progress percentage calculation
            const progressPercent = Math.min(
              100,
              Math.round((totalQualified / targetLeadCount) * 100)
            );

            // Checkpoint update
            await prisma.researchJob.update({
              where: { id: jobId },
              data: {
                total_qualified: totalQualified,
                total_rejected: totalRejected,
                total_needs_review: totalNeedsReview,
                total_duplicates: totalDuplicates,
                progress_percent: progressPercent,
              },
            });

            await prisma.campaign.update({
              where: { id: campaign.id },
              data: {
                progress: progressPercent,
              },
            });
          }

          nextPageToken = searchResponse.nextPageToken;
          pagesCount++;

          // If Google provides a nextPageToken, it requires a brief delay (usually ~1-2 seconds) before the token becomes active
          if (nextPageToken && pagesCount < maxPages && totalQualified < targetLeadCount) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } else {
            break;
          }
        } while (nextPageToken && pagesCount < maxPages && totalQualified < targetLeadCount);
      }
    }

    // Completion or partial completion
    const finalStatus =
      totalQualified >= targetLeadCount ? "COMPLETED" : "PARTIALLY_COMPLETED";

    await prisma.researchJob.update({
      where: { id: jobId },
      data: {
        status: finalStatus,
        current_stage: "COMPLETED",
        progress_percent: Math.min(100, Math.round((totalQualified / targetLeadCount) * 100)),
        completed_at: new Date(),
      },
    });

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: finalStatus,
        progress: Math.min(100, Math.round((totalQualified / targetLeadCount) * 100)),
        completed_at: new Date(),
      },
    });
  }
}
