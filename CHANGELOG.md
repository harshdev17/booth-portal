# Changelog

All notable changes to this portal will be documented in this file.

## v1.7.0 (2026-11-16)

### Added
- **Result Sheet Pre-Flight Preview & Issue Detection (`src/lib/allotment/declare-result.ts`, `src/app/api/admin/declare-result/route.ts`, `src/views/admin/declare-result/DeclareResultClient.tsx`)**:
  - Added `previewResultSheet()` and `action: 'preview'` API mode to validate sheet rows before committing to database.
  - Interactive Preview Modal displays all rows with live verification: highlights approved vs non-approved status, category matches, duplicate stalls/applications within sheet, occupied stalls, and new booths to be created.
  - Blocks staging if any row contains errors, allowing admins to inspect issues directly before saving.
- **WhatsApp Notification Triad for Allotment & Payment (`src/lib/notifications/aisensy.ts`, `src/lib/draw/draw-service.ts`, `src/lib/allotment/declare-result.ts`, `src/lib/notifications/payment-success.ts`)**:
  - `AISENSY_CAMPAIGN_DRAW_PAYMENT_ACTIVATION=gita_mahotsav_draw_payment_dyhmi`: Used whenever a candidate receives a booth allotment requiring payment (Lucky Draw & Result Declaration) to deliver the direct payment link.
  - `AISENSY_CAMPAIGN_ZERO_FEE_ALLOTMENT=zero_fee_allotment`: Used whenever a candidate receives a free/zero-fee stall allotment (Artisan, SARAS, Social Organizations, etc.) with booth number and status link.
  - `AISENSY_ALLOTMENT_PAYMENT_CONFIRMATION=gita_mahotsav_payment_confirmation_new`: Sent upon successful completion of allotment payment (`purpose = 'pay_now'`) to deliver payment receipt confirmation.
  - Omitted extraneous `buttonParam` on body-text link templates to prevent Meta/AiSensy 400 Bad Request parameter mismatches.
- **Candidate Full Dossier Redesign (`src/app/police/applications/[id]/page.tsx`)**:
  - Redesigned police dossier view into an executive verification layout with official police badge, candidate banner card, unmasked monospace Aadhaar with inspection badge, designated police station callout box, category declarations, and document preview actions.
- **Inventory Import Dialog Viewport & Preview Enhancements (`src/views/admin/inventory/ImportInventoryDialog.tsx`)**:
  - Pinned modal footer to ensure "Import", "Validate", and "Cancel" buttons remain 100% visible across all viewport sizes.
  - Converted active categories list into a collapsible accordion to conserve screen real estate.
  - Added row-level preview table in the validation step.

### Fixed
- **Suppressed Redundant Generic Status Update on Allotment (`src/lib/draw/draw-service.ts`, `src/lib/allotment/declare-result.ts`)**:
  - **Bug**: Draw and Declare Result previously called `notifyApplicationStatusChange`, dispatching a generic `gita_mahotsav_status_update` ("Your status has been updated") before or instead of the proper allotment campaign.
  - **Fix**: Removed generic status change notification; both draw and declare-result now route directly and exclusively to either `gita_mahotsav_draw_payment_dyhmi` (for fee-bearing categories) or `zero_fee_allotment` (for zero-fee categories).
- **Strict Exclusion of Pending Payment Stalls on Police Dashboard (`src/app/police/dashboard/page.tsx`, `src/app/(admin)/admin/police-stalls/page.tsx`)**:
  - **Bug**: Stalls reserved for payment (`su.status = 'reserved'` or `da.payment_status = 'pending'`) were displaying in `/police/dashboard` because query included any `da.status = 'active'`.
  - **Fix**: Restricted queries to stalls with `su.status = 'allotted'`, `(a.id IS NULL OR a.status = 'allotted')`, and `(da.id IS NULL OR da.payment_status IN ('paid', 'success', 'exempt', 'not_required') OR da.payment_status IS NULL)`. Stalls awaiting allotment payment are excluded until payment is confirmed.
- **Duplicate Booth Rows in Inventory & Direct Allotment Superseding (`src/views/admin/inventory/InventoryAdminPage.tsx`, `src/views/admin/inventory/InventoryTable.tsx`, `src/app/api/admin/inventory/import/route.ts`, `src/app/api/admin/inventory/[id]/direct-allot/route.ts`, `src/app/api/admin/direct-allotments/route.ts`)**:
  - **Bug**: Stalls re-allotted or updated via CSV appeared multiple times in `/admin/inventory` because multiple active rows existed in `direct_allotments` for the same `shop_unit_id`.
  - **Fix**:
    1. Joined `direct_allotments` using `MAX(id)` per `shop_unit_id` in `InventoryAdminPage.tsx`, guaranteeing exactly 1 row per shop unit even if legacy duplicate active rows exist.
    2. Added automatic deactivation (`status = 'cancelled', notes = 'Superseded'`) of prior active direct allotments whenever a stall is re-allotted or updated.
    3. Synchronized `direct_allotments.payment_status = 'paid'` in `applySuccessfulPaymentEffects()` when `pay_now` payment succeeds.
    4. Cleanly displays `Free Allotment` badge for confirmed zero-fee allotments instead of showing blank `—`.
- **Nodemailer Socket Timeout Conflict Resolution (`src/lib/notifications/email.ts`)**:
  - Resolved merge conflict in `email.ts` by standardizing `socketTimeout: 20_000` (20 seconds) for resilient outbound SMTP connections.

## v1.6.0 (2026-11-15)

### Added
- **Multi-Field Query Dialog (`src/views/admin/applications/MultiFieldQueryDialog.tsx`)**:
  - Staff can select multiple application fields (both standard and category-specific dynamic fields) via checkboxes, specify a single shared remark, and raise queries simultaneously.
  - Automatically disables already-queried fields and leaves individual per-row "Raise query" buttons available.
- **Batch Field Queries API Endpoint (`src/app/api/admin/applications/[id]/field-queries/route.ts`)**:
  - Accepts `{ fieldKeys: string[], remarks }`, executes atomic transactional validation and record creation in `application_field_queries`, and transitions application status to `query_raised`.
- **Consolidated Applicant Notifications (`src/lib/notifications/document-query.ts`)**:
  - `notifyFieldQueries()` aggregates all queried fields into a single WhatsApp + Email dispatch with numbered field entries.
- **Declare Result Management Flow (`src/app/(admin)/admin/declare-result/page.tsx`)**:
  - Complete bulk booth-sheet result upload, preview, transactional shop allotment, and applicant notification system.
- **Database Migrations Applied**:
  - `0080_application_field_queries.sql`: table for field-level corrections.
  - `0081_result_declaration_rows.sql`: table for booth-sheet result declarations.

### Fixed
- **Query Banner "Whole Application" Stale History Bug (`src/app/(admin)/admin/applications/[id]/page.tsx`)**:
  - Fixed issue where historical whole-application queries falsely surfaced in the active banner when only field-level queries were open.
- **Hostinger MySQL Connection Pool Optimization (`src/lib/db/client.ts`)**:
  - Reduced `connectionLimit` to 10 and aligned `maxIdle: 10` to prevent reaching Hostinger's 500 connections/hour cap.
  - Raised `idleTimeout` to `55000ms` and implemented auto-retry on transient disconnects.
  - Batched queries across admin pages via `withPooledConnection()`.

## v1.5.0 (2026-11-01)

### Added
- **Bulk CSV Inventory Import with Direct Allotment Support (`src/lib/inventory/shop-units-csv.ts`, `src/app/api/admin/inventory/import/route.ts`)**:
  - Extended bulk inventory import with 10 direct allotment columns: `Allottee Name`, `Contact Person`, `Father Name`, `Mobile Number`, `Aadhaar Number`, `Address`, `Police Station`, `Email`, `Work Purpose`, and `Stall Amount`.
  - Added intelligent keyword-based column detection (`findCol`) supporting arbitrary column order, case-insensitivity, and flexible header aliases.
  - Implemented automated application and direct allotment creation within atomic database transactions, linking `shop_units.allotted_to_application_id` automatically.
  - Support for Custom Categories: automatically detected, created, flagged as `is_direct_allotment = 1`, and closed to public applicant submissions.
  - Re-upload correction support: safely updates existing stalls, directions, amounts, and direct allotment details without creating duplicate stall records.
- **Dedicated Police Department Verification View (`src/views/admin/police/PoliceStallView.tsx`, `src/app/(admin)/admin/police/page.tsx`, `src/app/api/admin/police/stalls/route.ts`)**:
  - Introduced dedicated law enforcement view displaying verified allottee data for all occupied stalls across both draw allocations and direct allotments.
  - Displays verified allottee particulars: Stall No., Category, Allottee Name, Contact Person, Father's Name, Verified Mobile Number, Masked Aadhaar Number, Full Residential Address, Police Station, Email, and Work Purpose.
  - Strictly omits all financial/payment figures (Stall Amount, EMD, payment status, transaction IDs) per security requirements.
  - Dedicated CSV export endpoint for police field personnel (`/api/admin/police/stalls/export`).
  - Added role permission mapping (`inventory.view_police` / `requirePoliceAccess`) for law enforcement accounts.

### Changed
- **Allotment Status Workflow Automation (`src/app/api/admin/inventory/import/route.ts`)**:
  - **11 Main Categories**:
    - Direct Allotment with `Stall Amount = 0`: sets status immediately to `Allotted` (Free / Confirmed Allotment).
    - Direct Allotment with `Stall Amount > 0`: sets status to `Reserved for Payment` (`reserved`).
    - Unallotted stall with blank status: defaults to `Available`.
    - Unallotted stall with explicit status `Reserved for Allotment` (or `Direct Allotment` / `Hold`): sets status to `Reserved for Direct Allotment` (Hold for administrative manual allotment).
  - **Custom Categories**:
    - Custom categories are strictly for direct allotment and can **NEVER** be set to `Available`.
    - Direct Allotment with `Stall Amount = 0`: sets status to `Allotted` (Free / Confirmed Allotment).
    - Direct Allotment with `Stall Amount > 0`: sets status to `Reserved for Payment` (`reserved`).
    - Unallotted stall (regardless of status column): strictly set to **`Reserved for Direct Allotment`** (`reserved_for_direct_allotment`).
- **Payment Receipt Download Policy (`src/views/public/apply-success/SuccessPageView.tsx`)**:
  - Restricted payment receipt generation exclusively to applications where allotment has occurred and payment has been made; hidden for unallotted applications.

### Fixed
- **RFC 4180 CSV Field Escaping & Excel Column Shift Resolution (`src/lib/inventory/shop-units-csv.ts`, `test-sheets/`)**:
  - Fixed unquoted commas in category names (such as `"Sweets, Bakers and Special Food Items"`) that caused Microsoft Excel to split category strings across multiple columns and shift subsequent cell data.
  - Ensured all generated and exported CSV fields with commas, quotes, or newlines are properly enclosed in double quotes.
  - Enhanced Aadhaar number parsing to sanitize input (`replace(/\D/g, '')`, stripping leading/trailing quotes and scientific notation artifacts) ensuring resilient 12-digit validation.
  - Added UTF-8 Byte Order Mark (BOM) stripping (`replace(/^\uFEFF/, '')`) to prevent invisible character parse errors from Windows/Excel CSV exports.

## v1.4.0 (2026-10-20)

### Fixed
- **UAT & Production CSP Script Blocking Resolution (`src/proxy.ts`)**:
  - Removed `'strict-dynamic'` from `buildContentSecurityPolicy` which previously caused modern browsers to ignore `'self'` and host whitelists, blocking all Next.js static script chunks (`/_next/static/chunks/*.js`) and Google Analytics scripts on production/UAT deployments with `(blocked:csp)`.
  - Added explicit `'unsafe-inline'` and `'unsafe-eval'` support alongside `'self'` and `'nonce'`, enabling immediate client hydration and ending infinite loading screens.
- **Booth/Stall History Database Query Performance & Stability (`src/app/api/admin/inventory/[id]/history/route.ts`)**:
  - Replaced slow, unindexed `JSON_EXTRACT` full-table scans on `audit_logs` with fast indexed lookups (`entity_type = 'shop_unit' AND entity_id = ?`).
  - Swapped sequential database calls for a unified `Promise.all` fetching unit details, direct allotments, draw allocations, audit logs, and notification records concurrently, dropping latency from over 2 seconds to ~300ms.
  - Replaced non-existent `allotments` table reference with `draw_allocations` and corrected applicant name mapping to `COALESCE(a.representative_name, a.organisation_name)`.
- **Admin Inventory Table Horizontal Scrollbar Containment (`src/app/(admin)/layout.tsx`, `InventoryTable.tsx`)**:
  - Added `min-w-0` and `overflow-x-hidden` constraints across `SidebarInset`, `<main>`, and page containers to contain table overflow strictly within the `<Table>` container rather than pushing a full-window browser scrollbar.

### Changed
- **Institutional Terminology Standardization**:
  - Completely purged "lucky draw" terminology across the entire portal in favor of official government e-governance terms: **"Draw Process"**, **"Draw Allocation"**, and **"Public / Draw Stalls"**.
- **Allotment Guidelines & Direct Allotment Workflow (`InventoryTable.tsx`)**:
  - Redesigned Admin Guidance banners across Add, Edit, and Re-allocate modal dialogs to match the official KDB Navy (`#0c2847`) institutional theme with a crisp 3-card grid layout.
  - Formally codified the direct allotment fee rule: If stall fee is ₹0 (Free/Exempt), the stall is confirmed immediately and the official Allotment Letter is dispatched directly to the allottee via WhatsApp and Email; if stall fee is > ₹0, a secure payment link is issued first.
- **Stall History Modal User Interface Redesign (`InventoryTable.tsx`)**:
  - Replaced the oversized `w-[95vw] h-[86vh]` modal with a proportional, content-adaptive dialog (`sm:max-w-xl max-h-[85vh]`).
  - Transformed the timeline into a modern, human-crafted activity feed with color-coded status nodes, clean timestamps, and natural descriptions, eliminating artificial uppercase badges (`STALL.CREATED`) and raw internal IDs.
  - Added a clean 4-column metadata overview (Stall No., Direction, Fee, Allottee/App).
- **Allotment Letter Refinements (`src/lib/pdf/templates.ts`, `AllotmentLetterSheet.tsx`)**:
  - Added an official centered Kurukshetra Development Board watermark emblem with subtle opacity.
  - Simplified the generation date footer to `Generated on: DD/MM/YYYY` (removed trailing time strings and redundant online verification IDs).

## v1.3.0 (2026-10-17)

### Added
- **Section-Wise Application View on Admin Portal (`src/app/(admin)/admin/applications/[id]/page.tsx`)**:
  - Organized application details and category-specific dynamic fields into clear, structured sections matching the public application form.
  - Grouped category attributes under respective section labels (`Organisation Details`, `Booth/Stall Details`, `Department Details`, `Service Details`, `Company & Brand Details`, `Promotion`, etc.).
  - Textarea and multiselect fields now span full width across the two-column grid for clear readability by verification officers.
- **Database Migration 0050 (`0050_form_fields_update.sql`)**:
  - **Social Organizations (`ngos-social-organizations`)**: Removed `NGO` from `Type of Organization` options; configured options to `Society`, `Trust`, `Registered under Companies Act`, and `Others`.
  - **Government Departments (`govt-departments`)**: Deactivated redundant columns (`Government / Department Type`, `Government Employee Designation`, `Government ID Number of the Officer`); renamed `Service Requirement` to `Public Service Details` within the `Service Details` section alongside Department Name.
  - **Brand Promotion & Corporate (`brand-promotions`)**: Deactivated redundant category Contact section columns (`Business Email`, `Business Mobile Number`, `Representative Designation`) to streamline form entry.
- **Redesigned Government-Grade Digital Acknowledgment & Success Page (`src/views/public/apply-success/SuccessPageView.tsx`)**:
  - Rebuilt the post-submission and post-payment success screen with an authoritative, modern e-governance receipt layout matching KDB festival branding (gold ornamental crest, celebratory animated emerald success indicator, high-contrast typography).
  - Prominent **Application Reference Callout** with 1-click clipboard copy, verified timestamp (IST), and live status pill badge (`Submitted / Payment Pending`).
  - Integrated dedicated **Quick Action Buttons**:
    - **Print Application Form ("आवेदन पत्र प्रिंट करें")**: Instant one-click PDF print view.
    - **Download Payment Receipt ("भुगतान रसीद डाउनलोड करें")**: Official GST tax invoice payment receipt.
    - **Track Application Status ("आवेदन स्थिति ट्रैक करें")**: Direct lookup link.
  - **Structured Particulars Grid**: Key-value tiles displaying Applicant Name, Selected Category, Verified Registered Mobile, Submission Timestamp, Application Fee with Paid/Due status, and Razorpay Transaction Reference ID.
  - **Interactive 4-Step Progress Roadmap ("आगे की प्रक्रिया")**: Clearly communicates the full lifecycle from Application Received ➔ Document Scrutiny ➔ Allotment / Draw ➔ Allotment Letter & Possession.
  - **Official Helpdesk & Advisory Card**: Direct contact helpline (`01744-259503`), official email (`kdb.allotment@gmail.com`), office address, and anti-fraud advisory.
- **Universal Cryptographic Token Access for Receipt & Print (`/apply/receipt/[token]`, `/apply/print/[token]`)**:
  - Enhanced `/api/applications/summary`, `/api/applications/[id]/receipt`, and `/api/applications/[id]/print` to accept either bearer session tokens or encrypted `token` parameters (`x-application-token`).
  - Applicants and testers can now preview or reopen the success page, payment receipt, and application print sheet directly in any browser tab or window without losing access when closing the original session.
- **Single-Step Form OTP Verification & Direct In-Form Payment (`src/views/public/apply/ApplicationFormOrchestrator.tsx`)**:
  - Integrated mobile OTP verification dialog directly on the main application form page, completely removing any reliance on a separate Review page.
  - For paid categories, successful OTP verification immediately initializes and opens the Razorpay checkout modal directly on the form. Upon payment completion, the applicant is navigated directly to `/apply/[category]/success/[applicationNumber]`.
  - For free categories, OTP verification finalizes the application and navigates straight to `/apply/[category]/success/[applicationNumber]`.
- **Prominent Error Highlighting, Auto-Scroll & Focus on Form Validation (`src/views/public/apply/ApplicationFormOrchestrator.tsx`)**:
  - Clicking Submit immediately validates all required fields, dynamic category inputs, documents, and declarations.
  - If any mandatory field is missing or invalid, the form automatically scrolls to center the field in the viewport, sets cursor focus, and applies high-visibility red ring & background glow highlighting (`highlightElement`).
  - Added visual error highlight targets to `#documents-section` and `#declarations-section` when submissions lack documents or unchecked declarations.
- **Strict Portal-Wide Aadhaar Number Uniqueness**:
  - Added pre-submission and blur availability checking for Aadhaar numbers in `useAvailabilityCheck.ts` and `ApplicantInfoStep.tsx`.
  - Hardened `PATCH /api/applications/[id]` and `create-application.ts` with strict uniqueness validation against active applications (`status NOT IN ('draft', 'rejected', 'cancelled', 'not_selected')`).
  - If an existing Aadhaar is submitted, the form catches the duplicate, immediately highlights and focuses the Aadhaar field, and displays a localized error message without proceeding to OTP.
- **Universal KDB Rights Declaration for All Categories (`src/views/public/apply/DeclarationCheckboxes.tsx`)**:
  - Added mandatory declaration checkbox across all categories:
    - Hindi: *किसी भी आवेदन को किसी भी समय स्वीकार व निरस्त करने का अधिकार कुरुक्षेत्र विकास बोर्ड के पास सुरक्षित है। मैं इस बारें में भविष्य में कोई भी क्लेम नहीं करूँगा।*
    - English: *The Kurukshetra Development Board reserves the right to accept or reject any application at any time. I will not make any claim in this regard in the future.*
  - Enforced in `DeclarationCheckboxes.tsx`, `ApplicationFormOrchestrator.tsx`, `ReviewPageView.tsx`, and `src/lib/applications/schema.ts`.
- **Database Migration 0049 (`0049_refreshment_declaration_and_art_craft_fee.sql`)**:
  - Updated Refreshment Stall (`refreshment-stalls`) category declaration in both English and Hindi.
  - Updated Art & Craft (`special-art-craft`) allotment amount to ₹50,000 (`allotment_amount_paise = 5000000`).
- **High-Traffic Rate Limiting Configuration (`src/lib/security/rate-limit.ts`)**:
  - Introduced dedicated `applicationDraft` rate limit bucket granting 200 requests / 1 minute (resolved production 429 errors on form load caused by the previous 10/hour submission cap).
  - Scaled global rate limits across endpoints to support high crowd traffic: `applicationSubmit` (200/min), `documentUpload` (200/min), `statusLookup` (200/min), `receiptLookup` (200/min), and `categoryRead` (500/min).
  - Enhanced reverse proxy / CDN client IP discovery in `src/lib/security/request-meta.ts` to inspect `cf-connecting-ip`, `x-forwarded-for`, `x-real-ip`, and `x-client-ip`, preventing shared proxy IP collisions.
- **Database Migration 0048 (`0048_standardize_aabantan_spelling.sql`)**:
  - Created automated migration script to standardize existing category and notice descriptions in the database from `आवंटन` / `आवंटित` to `आबंटन` / `आबंटित`.

### Changed
- **Refreshment Stall Category Declaration (`refreshment-stalls`)**:
  - Updated category-specific declaration in both Hindi and English:
    - Hindi: *मैं केवल पैकेज्ड (पैक की हुई) खाद्य सामग्री ही बेचूँगा/बेचूँगी। मैं समझता/समझती हूँ कि इससे अलग प्रोडक्ट बेचते पाए जाने पर कुरुक्षेत्र विकास बोर्ड (KDB) द्वारा उचित कार्रवाई की जाएगी और मेरा बूथ/स्टॉल रद्द कर दिया जाएगा। और इसके लिए मैं कोई क्लेम नहीं करूँगा/करुँगी।*
    - English: *I will sell only packaged food items. I understand that if found selling any products other than this, appropriate action will be taken by the Kurukshetra Development Board (KDB) and my booth/stall will be cancelled, and I will not make any claim for this.*
- **Art & Craft Category Allotment Amount & Wording (`special-art-craft`)**:
  - Updated allotment amount from ₹30,000 to **₹50,000 (जीएसटी सहित) / ₹50,000 (including GST)** across database, `src/lib/content/category-guidelines.ts`, and `src/lib/content/apply-instructions.ts`.
  - Replaced legacy `आवंटन शुल्क` / `आबंटन शुल्क` with standardized **`बूथ/स्टॉल आबंटन राशि`**.
- **FAQ-9 Single Application Restriction Update (`src/components/public/FaqSection.tsx`)**:
  - Updated FAQ-9 in both Hindi and English to state strictly that only one application is permitted per individual, organisation, or trader in their eligible category.
  - Added warning that applying under concealed or altered identities will result in cancellation of stall allotment by Kurukshetra Development Board and regulatory action.
- **Category Cards Allotment Method Standard Wording (`src/lib/content/category-guidelines.ts`)**:
  - Updated `Allotment Method` (`selectionMethod`) across 6 key categories:
    - *Social Organizations (Registered)*
    - *Self Help Groups (SHG)*
    - *Artisan Card Holders*
    - *National Awardees*
    - *Art & Craft*
    - *Wooden Craft & Carpets (Large Space)*
  - Standardized bilingual label to:
    - English: `Direct Allotment / Draw (Please read all the guidelines carefully before applying online.)`
    - Hindi: `सीधा आबंटन / ड्रॉ के माध्यम से (ऑनलाइन आवेदन करने से पहले कृपया सभी दिशा-निर्देश ध्यानपूर्वक पढ़ें।)`
- **Portal-Wide Hindi Spelling Standardization (`आवंटन` / `आवंटित` -> `आबंटन` / `आबंटित`)**:
  - Standardized spelling across all UI cards, headers, footers, guideline documents, print views, and status sheets:
    - `src/components/public/CategoryCard.tsx`: "बूथ/स्टॉल आबंटन का तरीका", "बूथ/स्टॉल आबंटन राशि"
    - `src/components/public/PublicHeader.tsx`: "आबंटन पत्र डाउनलोड करें"
    - `src/components/public/PublicFooter.tsx`: "आबंटन प्रक्रिया" & portal summary
    - `src/app/(public)/allotment-letter/page.tsx`: "आबंटन पत्र"
    - `src/context/LanguageContext.tsx`: Translations for hero badge, features, category headings, and notices
    - `src/views/public/category-detail/index.tsx`: "बूथ/स्टॉल आबंटन राशि"
    - `src/views/public/guidelines/index.tsx`: Rule and procedure guidelines
    - `src/components/public/ImportantNoticeSection.tsx`: Allotment and eligibility notices
    - `src/views/public/apply-receipt/ReceiptPageView.tsx`, `SuccessPageView.tsx`, `ApplicationPrintSheet.tsx`, `status/index.tsx`, `templates.ts`: Application status badges (`आबंटित`, `पुनः आबंटित`) and official letterheads
    - `src/lib/content/apply-instructions.ts` & `category-guidelines.ts`: Full Hindi textual guidelines and instructions

## v1.2.0 (2026-10-11)

### Added
- **Full Applications Export Feature (`/api/admin/applications/export`)**:
  - Implemented streaming CSV export endpoint supporting both filtered search results and all submitted applications.
  - Added `ExportApplicationsButton` component with dropdown options to export filtered or complete application records with detailed metadata (applicant details, category, fees, queries, statuses).
- **Approved Status in Application Lifecycle & Database Schema**:
  - Expanded `applications.status` database ENUM to include `approved`.
  - Added `Approved for Draw` status badge, dedicated filter tab, and dedicated KPI metric card on `/admin/applications`.
  - Standardized application lifecycle: `under_review` (pending verification) -> `approved` (officer verified & eligible for draw) -> `allotted` (lucky draw winner allotted to stall).
- **Executive Operational Insights on Admin Dashboard (`/admin/dashboard`)**:
  - Replaced generic placeholder activity with actionable administration widgets:
    - Real-Time Application Stage Distribution breakdown (`under_review`, `approved`, `query_raised`, `allotted`, `rejected`).
    - Urgent Action Items panel tracking pending verifications, applicant query responses, and draw-ready queues.
    - Category-wise Demand & Stall Allocation load matrix comparing quotas against incoming applications.

### Changed
- **Lucky Draw Service Eligibility Engine (`src/lib/draw/draw-service.ts`)**:
  - Updated candidate selection query in both simulation and live execution modes to consider exclusively `approved` applications. Applications in `under_review` status are strictly excluded until verified by an officer.
  - Successfully drawn candidates now explicitly transition to status `allotted` alongside shop unit allotment.
- **Officer Verification Workflow (`/api/admin/applications/[id]/approve`)**:
  - Officer document approval action now sets application status to `approved`, qualifying it for the upcoming computerized lucky draw.
- **Draw Control Center UI (`/admin/draw`)**:
  - Updated eligible candidate counts and labels to reflect verified `approved` applications ready for draw execution.
- **UI & Layout Cleanliness**:
  - Cleaned up container spacing and resolved negative margin card header clipping across dashboard and reporting screens.
  - Removed all emojis across portal controls, badges, and headers in adherence with institutional design standards.

## v1.1.0 (2026-09-27)

### Added
- **Top Important Information Marquee Ticker**: Added a continuous news and announcement ticker directly above the header with a slim golden gradient accent border separating it from navigation. Fully responsive and supports real-time Hindi/English translation.
- **Dedicated Application Status Check Section**: Added right below categories matching the official reference image (`.ai/ChatGPT Image Sep 27, 2026, 02_05_38 PM.png`). Includes direct Application Number search card, informational benefits card, and a connected 4-step workflow process.
- **Custom Workflow & Status Vector Icons**: Integrated 8 custom SVGs from `public/images/public/gita-mahotsav-status-section-icons/` across cards and workflow steps.
- **Official 10 Gita Mahotsav 2026 Stall Categories**: Seeded official categories with allotment rules (Free KDB Manual, Manual Auction, Lucky Draw, Application Fee, Tender).
- **Custom Category Vector Icons**: Applied 10 dedicated SVGs from `public/images/public/gita-mahotsav-category-icons/`.
- **5-Column Responsive Stall Grid**: Category section displays exactly 5 stalls per row on desktop matching the official design layout.
- **Full Application Flow Theme Unification**: Redesigned `/apply/[category]`, `/apply/[category]/review/[applicationId]`, and `/apply/[category]/success/[applicationNumber]` with the warm heritage aesthetic (`#faf8f5`), official gold ornamental header dividers, numbered saffron badges, rounded-2xl cards, and solid institutional navy buttons.
- **Dedicated FAQ Section (`FaqSection.tsx`)**: Recreated exact 2-column accordion FAQ layout matching `.ai/faq-ref.png` with background image `public/images/public/faq-bg.png` and 10 interactive questions and answers.
- **Dedicated Contact & Helpdesk Banner (`ContactBannerSection.tsx`)**: Implemented 4-card support banner matching `.ai/contact-banner-ref.png` with official vector icons (`phone.svg`, `email.svg`, `location.svg`, `headset.svg`).
- **Section Composite Backgrounds**: Integrated `gita-mahotsav-bg.png` for hero and `ChatGPT Image Sep 27, 2026, 01_52_37 PM.png` with Brahma Sarovar & chariot sunset for the categories section.
- **Full Bilingual Support**: Real-time Hindi and English language switching across all public portal components.

## v1.0.0 (2026-07-10)

### Added

#### Initial release

- Dashboard
  - Orders Dashboard
- Apps
  - Mail
  - Calendar
  - Users
- Pages
  - User Settings
  - User Profile
  - Login Page
  - Register Page
  - Forgot Password Page
  - Verify Email Page
  - Reset Password Page
  - Two Steps Verification Page
  - Error Page
- Forms & Tables
  - Form Layouts
  - Form Validation
  - Data Table
