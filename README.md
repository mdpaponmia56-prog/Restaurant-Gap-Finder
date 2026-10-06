# Restaurant Website Gap Finder

> **Operational B2B Lead Intelligence & Digital Gap Discovery Engine**  
> *Production-Ready | Zero-Mock Guarantee | Real Background Worker | SSRF Defense*

---

## 1. Product Overview

**Restaurant Website Gap Finder** is a production B2B lead-generation platform designed for web agencies, developers, and restaurant consultants. It discovers real, high-volume dining establishments, verifies whether they lack an official website, enriches their public business information, deduplicates listings, calculates 100-point sales opportunity scores, and provides RFC 4180 CSV / JSON exports.

### Zero-Mock / Zero-Fabrication Policy
- **No fake data:** If an API key is missing, an explicit configuration notice is displayed.
- **Real Google Places API (New):** Direct integration with `https://places.googleapis.com/v1/places:searchText` using field masks and official Place IDs.
- **Genuine Website Probes:** Probes candidate links via HTTP/Cheerio with strict SSRF defense (blocking RFC 1918 private IPs, loopback, and link-local ranges).
- **Target Shortfall Accuracy:** If 1,000 leads are requested and only 427 meet criteria, exactly 427 verified leads are returned.
- **Real Persistent Storage:** Relational database powered by Prisma ORM (`prisma/dev.db` by default, or PostgreSQL via `DATABASE_URL`).

---

## 2. Architecture & Pipeline

```
Frontend (Next.js 15 + React 19 + Tailwind CSS)
   ↓ POST /api/research/start
Research Worker Service (In-process persistent job runner)
   ↓
[Stage 1] Google Places API (New) Discovery
   ↓
[Stage 2] Rating & Review Volume Qualification
   ↓
[Stage 3] Deduplication (Place ID, Normalized Phone, Coordinates Haversine, Name Levenshtein)
   ↓
[Stage 4] Website Verification (SSRF Check, Platform Classification, Cheerio Title & Meta Parser)
   ↓
[Stage 5] Data Enrichment (Public phone, WhatsApp indication, Email, Social profiles, Owner)
   ↓
[Stage 6] 100-Point Lead Opportunity Scoring
   ↓
[Stage 7] Relational Database Persistence (Prisma ORM)
   ↓
Frontend Telemetry Polling (Real progress, stage, counters, pause/resume/cancel controls)
```

---

## 3. Technology Stack

- **Framework:** Next.js 15 (App Router, Server Actions & Route Handlers)
- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons
- **Database & ORM:** Prisma ORM with SQLite (zero-config local persistence) or PostgreSQL
- **Web Verification:** Cheerio HTML parser with DNS-level SSRF defense
- **Authentication:** Bcrypt password hashing + JOSE JWT session cookies
- **Testing:** Native Node.js test runner with `tsx` (18 automated tests passing across 8 suites)

---

## 4. Quick Start & Setup

### Prerequisites
- Node.js >= v20 (tested on Node v26)
- npm >= 10

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database Schema
```bash
npm run prisma:push
```
*Creates `dev.db` with all tables (`User`, `Campaign`, `CampaignLocation`, `ResearchJob`, `RestaurantLead`, `LeadSource`, `VerificationHistory`, `ApiSetting`, `ApiAuditLog`) and indexes.*

### 3. Run Automated Test Suite
```bash
npm test
```
*Executes all 18 automated tests for SSRF protection, website verification, deduplication, scoring, natural language search, authentication, and database persistence.*

### 4. Start the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 5. Google Places API (New) Configuration

1. Visit the [Google Cloud Console](https://console.cloud.google.com).
2. Enable the **Places API (New)** under APIs & Services.
3. Generate an API Key (optionally restrict to Places API New).
4. Configure it in the application using either method:
   - **Method A (In-App UI):** Open the **Settings** tab in the top navigation, enter your API key, click **Test Key**, and click **Save Key to Database**.
   - **Method B (Environment Variable):** Add to your `.env` file:
     ```env
     GOOGLE_MAPS_API_KEY="AIzaSy..."
     ```

---

## 6. Default Admin Account

The system seeds a default administrative user if no users exist:
- **Email:** `admin@restaurantgapfinder.com`
- **Password:** `admin12345`

You can also register a new account anytime via the **Sign In** modal in the top navigation.

---

## 7. Natural Language Search Queries

The application translates natural language prompts into database search filters:
- *"Show me Mexican restaurants in Los Angeles with more than 500 reviews and no official website"*
- *"Italian restaurants in Chicago with rating above 4.0"*
- *"High digital gap seafood in Miami"*

---

## 8. Exporting Real Leads

Export actual database records at any time:
- **CSV:** Formatted according to RFC 4180 with standard quotes and escaping.
- **JSON:** Complete nested representation including source verification links and audit history.
- Use the direct export buttons on the **Restaurant Leads** page or configure custom exports on the **Exports** page.
