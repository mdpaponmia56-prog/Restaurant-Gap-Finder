export interface ParsedFilters {
  category?: string;
  city?: string;
  minReviews?: number;
  minRating?: number;
  websiteRequirement?: "NO_OFFICIAL_WEBSITE" | "HAS_WEBSITE" | "ANY";
  digitalGapLabel?: "HIGH DIGITAL GAP" | "MEDIUM DIGITAL GAP" | "LOW DIGITAL GAP";
  rawExplanation: string;
}

export class NaturalLanguageSearchService {
  /**
   * Parse natural language prompts into actual database search and filter parameters
   */
  static parseQuery(query: string): ParsedFilters {
    const q = query.toLowerCase();
    const explanationParts: string[] = [];
    const result: ParsedFilters = {
      rawExplanation: "",
    };

    // 1. Check for review count constraints
    // e.g. "more than 500 reviews", "> 300 reviews", "at least 100 reviews", "500+ reviews"
    const reviewMatch = q.match(/(?:more than|>|at least|over|above|\+)?\s*(\d+)\s*(?:\+)?\s*reviews?/);
    if (reviewMatch) {
      result.minReviews = parseInt(reviewMatch[1], 10);
      explanationParts.push(`Minimum reviews: ${result.minReviews}`);
    }

    // 2. Check for rating constraints
    // e.g. "rating 4.5", "above 4.0 rating", "4.0+ stars"
    const ratingMatch = q.match(/(?:rating|stars?)\s*(?:above|over|>=|>)?\s*(\d(?:\.\d)?)|(\d(?:\.\d)?)\s*(?:\+)?\s*(?:star|rating)/);
    if (ratingMatch) {
      const val = parseFloat(ratingMatch[1] || ratingMatch[2]);
      if (val >= 1 && val <= 5) {
        result.minRating = val;
        explanationParts.push(`Minimum rating: ${val}`);
      }
    }

    // 3. Check for website requirement
    if (
      q.includes("no website") ||
      q.includes("no official website") ||
      q.includes("without a website") ||
      q.includes("without website") ||
      q.includes("lacking website") ||
      q.includes("missing website")
    ) {
      result.websiteRequirement = "NO_OFFICIAL_WEBSITE";
      explanationParts.push("Website requirement: No official website (Gap candidate)");
    } else if (q.includes("has website") || q.includes("with website")) {
      result.websiteRequirement = "HAS_WEBSITE";
      explanationParts.push("Website requirement: Has official website");
    }

    // 4. Check for Digital Gap priority
    if (q.includes("high gap") || q.includes("high digital gap") || q.includes("top priority")) {
      result.digitalGapLabel = "HIGH DIGITAL GAP";
      explanationParts.push("Opportunity: High Digital Gap");
    }

    // 5. Check for common cuisine categories
    const cuisines = [
      "mexican",
      "italian",
      "japanese",
      "chinese",
      "indian",
      "thai",
      "pizza",
      "burger",
      "sushi",
      "seafood",
      "steakhouse",
      "bbq",
      "barbecue",
      "bakery",
      "cafe",
      "coffee",
      "mediterranean",
      "french",
      "vietnamese",
      "tacos",
    ];

    for (const cuisine of cuisines) {
      if (new RegExp(`\\b${cuisine}\\b`, "i").test(q)) {
        result.category = cuisine.charAt(0).toUpperCase() + cuisine.slice(1);
        explanationParts.push(`Category: ${result.category}`);
        break;
      }
    }

    // 6. Check for common cities
    const cityList = [
      "los angeles",
      "new york",
      "chicago",
      "houston",
      "phoenix",
      "philadelphia",
      "san antonio",
      "san diego",
      "dallas",
      "austin",
      "san jose",
      "san francisco",
      "seattle",
      "denver",
      "boston",
      "miami",
      "atlanta",
      "las vegas",
      "orlando",
      "portland",
      "london",
      "toronto",
      "sydney",
    ];

    for (const city of cityList) {
      if (q.includes(city)) {
        result.city = city
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ");
        explanationParts.push(`Location: ${result.city}`);
        break;
      }
    }

    // If city wasn't in explicit list, check "in <City>" pattern
    if (!result.city) {
      const inCityMatch = q.match(/\bin\s+([a-zA-Z\s]+?)(?:\s+with|\s+having|\s+where|\s+and|\s*$)/);
      if (inCityMatch && inCityMatch[1].trim().length > 2) {
        const extracted = inCityMatch[1].trim();
        // ignore common non-city words
        if (!["california", "texas", "florida", "usa"].includes(extracted.toLowerCase())) {
          result.city = extracted
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          explanationParts.push(`Location: ${result.city}`);
        }
      }
    }

    result.rawExplanation =
      explanationParts.length > 0
        ? `Interpreted query conditions: ${explanationParts.join(", ")}`
        : "No specific criteria extracted. Searching general leads.";

    return result;
  }
}
