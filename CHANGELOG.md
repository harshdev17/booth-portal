# Changelog

All notable changes to this portal will be documented in this file.

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
