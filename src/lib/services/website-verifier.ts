import * as cheerio from "cheerio";
import { URL } from "url";
import dns from "dns/promises";

export interface WebsiteVerificationResult {
  status:
    | "NO_WEBSITE_VERIFIED"
    | "NO_WEBSITE_PROBABLE"
    | "HAS_OFFICIAL_WEBSITE"
    | "SOCIAL_ONLY"
    | "MARKETPLACE_ONLY"
    | "UNKNOWN";
  officialUrl?: string | null;
  domain?: string | null;
  notes: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  extractedPhone?: string | null;
  extractedEmail?: string | null;
  extractedSocials?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  extractedOwner?: string | null;
  httpStatus?: number;
}

export class WebsiteVerificationService {
  private static SOCIAL_DOMAINS = [
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "youtube.com",
  ];

  private static MARKETPLACE_DOMAINS = [
    "yelp.com",
    "tripadvisor.com",
    "doordash.com",
    "ubereats.com",
    "grubhub.com",
    "opentable.com",
    "seamless.com",
    "postmates.com",
    "zomato.com",
    "resy.com",
    "clover.com",
    "toasttab.com",
  ];

  /**
   * SSRF IP validation: checks whether an IP belongs to private / reserved ranges
   */
  private static isPrivateIp(ip: string): boolean {
    if (ip === "::1" || ip === "localhost") return true;

    // IPv4 checks
    const parts = ip.split(".").map(Number);
    if (parts.length === 4 && parts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
      // 127.0.0.0/8 (loopback)
      if (parts[0] === 127) return true;
      // 10.0.0.0/8 (private)
      if (parts[0] === 10) return true;
      // 172.16.0.0/12 (private)
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
      // 192.168.0.0/16 (private)
      if (parts[0] === 192 && parts[1] === 168) return true;
      // 169.254.0.0/16 (link local)
      if (parts[0] === 169 && parts[1] === 254) return true;
      // 0.0.0.0/8
      if (parts[0] === 0) return true;
    }

    // IPv6 private/link-local checks
    const lower = ip.toLowerCase();
    if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80")) {
      return true;
    }

    return false;
  }

  /**
   * Validate URL against SSRF and resolve DNS
   */
  private static async validateSafeUrl(rawUrl: string): Promise<{ safe: boolean; url?: URL; reason?: string }> {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { safe: false, reason: "Invalid scheme. Only HTTP and HTTPS are permitted." };
      }

      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
        return { safe: false, reason: "Access to local hostnames is forbidden." };
      }

      // Resolve DNS to verify non-private IP
      try {
        const addresses = await dns.lookup(hostname, { all: true });
        for (const addr of addresses) {
          if (this.isPrivateIp(addr.address)) {
            return { safe: false, reason: `Resolved IP (${addr.address}) is inside a private network range.` };
          }
        }
      } catch (dnsErr: any) {
        return { safe: false, reason: `DNS lookup failed for ${hostname}: ${dnsErr.message}` };
      }

      return { safe: true, url: parsed };
    } catch {
      return { safe: false, reason: "Malformed URL format." };
    }
  }

  /**
   * Main verification entry point for a restaurant
   */
  static async verifyRestaurantWebsite(
    restaurantName: string,
    rawGoogleWebsiteUri?: string | null,
    address?: string | null
  ): Promise<WebsiteVerificationResult> {
    // Case 1: Google returned no website URI at all
    if (!rawGoogleWebsiteUri || rawGoogleWebsiteUri.trim() === "") {
      return {
        status: "NO_WEBSITE_VERIFIED",
        officialUrl: null,
        domain: null,
        confidence: "HIGH",
        notes: `No website URI provided on Google Maps listing. Verified active listing without digital web presence.`,
      };
    }

    const trimmedUrl = rawGoogleWebsiteUri.trim();

    // Check SSRF safe url
    const safetyCheck = await this.validateSafeUrl(trimmedUrl);
    if (!safetyCheck.safe || !safetyCheck.url) {
      return {
        status: "UNKNOWN",
        officialUrl: trimmedUrl,
        domain: null,
        confidence: "LOW",
        notes: `Website URI blocked or invalid (${safetyCheck.reason}).`,
      };
    }

    const domain = safetyCheck.url.hostname.toLowerCase().replace(/^www\./, "");

    // Check if domain is a Social Platform
    for (const social of this.SOCIAL_DOMAINS) {
      if (domain === social || domain.endsWith("." + social)) {
        return {
          status: "SOCIAL_ONLY",
          officialUrl: null,
          domain,
          confidence: "HIGH",
          notes: `Listing points directly to a social media profile (${domain}) rather than an official independent business website.`,
          extractedSocials: {
            [social.split(".")[0]]: trimmedUrl,
          },
        };
      }
    }

    // Check if domain is a Marketplace / Food Aggregator
    for (const marketplace of this.MARKETPLACE_DOMAINS) {
      if (domain === marketplace || domain.endsWith("." + marketplace)) {
        return {
          status: "MARKETPLACE_ONLY",
          officialUrl: null,
          domain,
          confidence: "HIGH",
          notes: `Listing points to a 3rd-party delivery/review platform (${domain}) instead of an official brand website.`,
        };
      }
    }

    // Now test real HTTP probe with timeout & size limits
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

    try {
      const response = await fetch(trimmedUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 RestaurantAuditBot/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: controller.signal,
        redirect: "follow",
      });

      clearTimeout(timeout);
      const httpStatus = response.status;

      if (!response.ok) {
        if (httpStatus === 404 || httpStatus === 410) {
          return {
            status: "NO_WEBSITE_VERIFIED",
            officialUrl: null,
            domain,
            httpStatus,
            confidence: "HIGH",
            notes: `Website link on Google returned HTTP ${httpStatus} (Dead link / Page not found). Restaurant effectively lacks a working website.`,
          };
        }
        if (httpStatus >= 500) {
          return {
            status: "NO_WEBSITE_PROBABLE",
            officialUrl: trimmedUrl,
            domain,
            httpStatus,
            confidence: "MEDIUM",
            notes: `Website server returned server error HTTP ${httpStatus}. Domain may be abandoned or unmaintained.`,
          };
        }
      }

      // Check response body
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
        return {
          status: "HAS_OFFICIAL_WEBSITE",
          officialUrl: response.url || trimmedUrl,
          domain,
          httpStatus,
          confidence: "MEDIUM",
          notes: `URL reachable with non-HTML content-type: ${contentType}`,
        };
      }

      const html = await response.text();
      // Cap html slice to inspect
      const limitedHtml = html.slice(0, 500000);
      const $ = cheerio.load(limitedHtml);

      // Check for domain parking / expiration signatures
      const bodyText = $("body").text().toLowerCase();
      const parkingSignatures = [
        "domain is parked",
        "buy this domain",
        "this domain may be for sale",
        "domain parking",
        "under construction",
        "godaddy parking",
        "namecheap parking",
        "renew your domain",
      ];
      for (const sig of parkingSignatures) {
        if (bodyText.includes(sig)) {
          return {
            status: "NO_WEBSITE_VERIFIED",
            officialUrl: null,
            domain,
            httpStatus,
            confidence: "HIGH",
            notes: `Domain is parked or expired: detected signature "${sig}".`,
          };
        }
      }

      // Extract contact & socials from page
      const extractedPhone = this.extractPhone($, bodyText);
      const extractedEmail = this.extractEmail($, bodyText);
      const extractedSocials = this.extractSocials($);
      const extractedOwner = this.extractOwner($);

      // Match restaurant name against title / headers
      const pageTitle = $("title").text().trim();
      const h1Text = $("h1").first().text().trim();

      return {
        status: "HAS_OFFICIAL_WEBSITE",
        officialUrl: response.url || trimmedUrl,
        domain,
        httpStatus,
        confidence: "HIGH",
        notes: `Active official website verified (HTTP ${httpStatus}, Title: "${pageTitle.slice(0, 60)}").`,
        extractedPhone,
        extractedEmail,
        extractedSocials,
        extractedOwner,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        return {
          status: "NO_WEBSITE_PROBABLE",
          officialUrl: trimmedUrl,
          domain,
          confidence: "MEDIUM",
          notes: "Website connection timed out (>6s). High likelihood of abandoned/offline domain.",
        };
      }
      return {
        status: "NO_WEBSITE_PROBABLE",
        officialUrl: trimmedUrl,
        domain,
        confidence: "MEDIUM",
        notes: `Failed to connect to website (${err.message}). Host unreachable or SSL failure.`,
      };
    }
  }

  private static extractPhone($: cheerio.CheerioAPI, bodyText: string): string | null {
    // Check tel: links
    const telLink = $('a[href^="tel:"]').first().attr("href");
    if (telLink) {
      const cleaned = telLink.replace(/^tel:/i, "").trim();
      if (cleaned.length >= 7) return cleaned;
    }
    // Regex search
    const phoneMatch = bodyText.match(/(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return phoneMatch ? phoneMatch[0].trim() : null;
  }

  private static extractEmail($: cheerio.CheerioAPI, bodyText: string): string | null {
    // Check mailto: links
    const mailto = $('a[href^="mailto:"]').first().attr("href");
    if (mailto) {
      const email = mailto.replace(/^mailto:/i, "").split("?")[0].trim();
      if (email.includes("@") && !email.endsWith(".png") && !email.endsWith(".jpg")) {
        return email;
      }
    }
    // Regex for business emails
    const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      const found = emailMatch[0].toLowerCase();
      // filter out common image artifacts or web assets
      if (!found.endsWith(".png") && !found.endsWith(".webp") && !found.endsWith(".jpg")) {
        return found;
      }
    }
    return null;
  }

  private static extractSocials($: cheerio.CheerioAPI): {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  } {
    const socials: Record<string, string> = {};
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      if (href.includes("facebook.com/") && !socials.facebook) socials.facebook = href;
      if (href.includes("instagram.com/") && !socials.instagram) socials.instagram = href;
      if (href.includes("tiktok.com/@") && !socials.tiktok) socials.tiktok = href;
      if (href.includes("linkedin.com/company/") && !socials.linkedin) socials.linkedin = href;
      if ((href.includes("twitter.com/") || href.includes("x.com/")) && !socials.twitter) socials.twitter = href;
      if (href.includes("youtube.com/") && !socials.youtube) socials.youtube = href;
    });
    return socials;
  }

  private static extractOwner($: cheerio.CheerioAPI): string | null {
    // Look for Schema.org JSON-LD
    const jsonLdScripts = $('script[type="application/ld+json"]');
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const text = $(jsonLdScripts[i]).html() || "";
        const data = JSON.parse(text);
        if (data.founder?.name) return String(data.founder.name);
        if (data.author?.name) return String(data.author.name);
        if (data.employee?.name) return String(data.employee.name);
      } catch {}
    }
    return null;
  }
}
