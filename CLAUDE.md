# CLAUDE.md — Permanent Project Instructions

**This file is the first thing to read in this repository, every session, before any code change.**

This file defines the permanent working rules for any Claude session (or other AI/developer) operating on this repository. It is deliberately short and rule-based. Detailed project knowledge — requirements, flows, architecture, design, database, security specifics — lives in [`./.ai/README.md`](./.ai/README.md) and the rest of the `.ai/` folder.

```
CLAUDE.md   → permanent working rules / coding rules / AI behavior   (this file)
      ↓
.ai/        → detailed project knowledge / requirements / architecture / UX / business rules
```

Do not duplicate `.ai/` content here, and do not let this file drift out of sync with `.ai/AI_DEVELOPMENT_RULES.md` — if they conflict, treat that as a documentation bug to flag, not something to silently resolve.

---

## 1. Project Identity

- **Project:** KDB Booth / Shop Allotment Portal
- **Organization:** Kurukshetra Development Board (KDB)
- **Purpose:** Online portal for applications, payments, selection/draw, shop/stall inventory, allotment, and authorized verification for commercial spaces associated with International Gita Mahotsav 2026 in Kurukshetra.
- **Current repository state:** This repo is currently the **AdminCN Free** shadcn/ui + Next.js admin template — a generic open-source starter with no KDB business logic. It is used as a **visual/structural design reference only**. See [`.ai/DECISIONS.md`](./.ai/DECISIONS.md) and [`.ai/ARCHITECTURE.md`](./.ai/ARCHITECTURE.md).
- **Status:** Pre-implementation. Documentation-first. Do not assume any KDB feature is already built.

## 2. First Action in Every Session

Before making any code changes:

1. Read this file (`CLAUDE.md`).
2. Read [`.ai/README.md`](./.ai/README.md).
3. Read the relevant `.ai/*.md` files for the requested task.
4. Inspect the existing implementation (don't assume — check).
5. Understand dependencies and affected modules.
6. Plan the change.
7. Only then modify code.

Never blindly start coding.

## 3. Source of Truth Priority

When information conflicts, resolve in this order:

1. Explicit user instruction in the current conversation
2. Approved project decisions in [`.ai/DECISIONS.md`](./.ai/DECISIONS.md)
3. [`.ai/SCOPE.md`](./.ai/SCOPE.md)
4. [`.ai/BUSINESS_RULES.md`](./.ai/BUSINESS_RULES.md)
5. Relevant `.ai/*.md` documentation
6. Existing project implementation
7. General engineering best practices

Never invent business requirements. **If requirements conflict, STOP and surface the conflict — do not silently pick an interpretation.**

## 4. Scope Control

Do not expand scope automatically. See [`.ai/SCOPE.md`](./.ai/SCOPE.md) for full detail.

**Current core scope:**
Payment Form · Main Website Application Form · Admin Applications · Applicant/User Details · Admin Payments · Razorpay Settings · WhatsApp/SMS Settings · Draw Process · Shop Allotment · Application Download · Allotment Letter Download · Application Status · Admin-controlled Pay Now · Inventory Management · Audit Logs · Reports & Export · Configurable Fees · Configurable Categories · Configurable Inventory.

**Additional approved features:**
Document Verification · RBAC / User Roles & Permissions · Application Query / Clarification · Cancellation & Re-Allotment.

Everything else is future/out-of-scope unless explicitly approved — see [`.ai/FUTURE_SCOPE.md`](./.ai/FUTURE_SCOPE.md).

## 5. Configuration Principle

Never hard-code business values that may change between events: fees, GST, categories, shop counts/inventory, event dates, application dates, payment activation, selection rules, notification settings. These must be configurable per [`.ai/CONFIGURATION.md`](./.ai/CONFIGURATION.md).

## 6. Design System

AdminCN (shadcn-based admin template) is the **visual reference**, not a functionality spec. Reuse its layout/sidebar/header/card/table/form/filter/tab/dialog/drawer/badge/pagination/responsive patterns; adapt fully to KDB. Do not copy unrelated demo modules (mail, calendar, kanban, etc.) or demo business logic. The result must feel like an official KDB portal, not a copied AdminCN demo. See [`.ai/DESIGN_SYSTEM.md`](./.ai/DESIGN_SYSTEM.md) and [`.ai/ADMIN_PANEL.md`](./.ai/ADMIN_PANEL.md).

## 7. UI/UX Rules

Portal must be clean, professional, modern, government/enterprise-appropriate, trustworthy, easy to use, information-focused.

Avoid: excessive gradients, excessive animation, glassmorphism, huge decorative elements, random icons, overly colorful dashboards, generic-SaaS or AI-generated look.

- **Public website:** welcoming, visual, culturally appropriate (Hindi-first, Hindi/English/Punjabi).
- **Admin panel:** operational, clean, information-dense.

See [`.ai/UI_UX_GUIDELINES.md`](./.ai/UI_UX_GUIDELINES.md) and [`.ai/HOMEPAGE.md`](./.ai/HOMEPAGE.md).

## 8. Tech Stack

Next.js · TypeScript · Tailwind CSS · shadcn/ui · MySQL · Hostinger · Razorpay · WhatsApp/SMS provider (TBD) · PDF generation · secure token-based QR verification.

Do not introduce a new major framework/library without clear reason. Before adding a dependency: check if an existing one already solves it, prefer existing project patterns, avoid unnecessary dependencies.

## 9. Security Rules

Mandatory considerations: authentication, authorization, RBAC, input validation, SQL injection prevention, XSS prevention, file upload validation, secure file access, payment verification, webhook verification, rate limiting, sensitive data masking, audit logging, export permissions, HTTPS, environment variables, secrets management.

**Never expose:** database credentials, API secrets, Razorpay secret keys, WhatsApp/SMS credentials, passwords, private tokens. Never put secrets directly in source code.

See [`.ai/SECURITY.md`](./.ai/SECURITY.md).

## 10. QR Security

Allotment QR codes carry a secure random **verification token**, never sensitive applicant information directly.

Verification flow must: (1) validate the token, (2) verify the authenticated admin user, (3) check role/permission, (4) return only permitted information, (5) record the verification in audit logs. Public/unauthorized scans must never expose applicant information. See [`.ai/QR_VERIFICATION.md`](./.ai/QR_VERIFICATION.md).

## 11. RBAC

Never assume any admin can access everything. Every protected operation (view/create/edit/delete/approve/reject/verify/allot/draw/payment/export/QR verification/configuration) must be permission-checked server-side. See [`.ai/RBAC.md`](./.ai/RBAC.md).

## 12. Audit Logging

Audit application changes, approval/rejection, document verification, payment changes, draw execution/approval, shop allotment, cancellation, re-allotment, QR verification, settings changes, data exports, role changes. See [`.ai/AUDIT_LOGS.md`](./.ai/AUDIT_LOGS.md).

## 13. Database Rules

Check [`.ai/DATABASE.md`](./.ai/DATABASE.md) before modifying database structure. Critical business constraints (e.g., a shop/stall must never have two simultaneous active allotments) must be enforced at the backend/database level, not only in the frontend.

## 14. Component Reuse

Before creating a new component: search existing components, check [`.ai/COMPONENTS.md`](./.ai/COMPONENTS.md), reuse or extend before creating new. Avoid duplicate components with slightly different names.

## 15. API / Backend Rules

Frontend is never trusted for authorization. Backend independently validates authentication, permission, input, business rules, payment state, allotment state, and ownership/access — regardless of what the UI shows or hides.

## 16. Error Handling

Every important flow must handle: loading, empty, success, validation error, permission denied, server error, network error, payment failure, session expiry. Never expose raw backend/database errors to users.

## 17. Responsive Design

All public pages must be responsive. Admin pages are desktop-first but must remain usable on tablet/mobile. Tables, forms, and filters need intentional responsive behavior — not just shrinking desktop layouts.

## 18. Code Quality

TypeScript best practices, clean architecture, small reusable components, meaningful names, no unnecessary duplication, no dead code, no undocumented temporary hacks, proper validation and error handling, consistent formatting, existing project conventions. Do not rewrite working code unnecessarily.

## 19. Change Management

**Before** a major change, explain: what is changing, why, files/modules affected, and database/API/UI/security/migration impact.

**After** implementation: update relevant `.ai/*.md` docs and [`.ai/CHANGELOG.md`](./.ai/CHANGELOG.md). If an architectural decision was made, record it in [`.ai/DECISIONS.md`](./.ai/DECISIONS.md).

## 20. Documentation Rule

Keep `.ai/` synchronized with the implementation. If code behavior changes, check whether documentation needs updating. Never allow "documentation says X, code does Y" to persist silently — document the discrepancy explicitly if it can't be fixed immediately.

## 21. No-Assumptions Rule

If something is not defined, do not invent it. Mark it:

```
[TBC – Business Confirmation Required]
```

Examples: exact eligibility rules, final categories, final shop numbers, refund rules, draw algorithm, document requirements, final roles, notification provider, notification templates, cancellation rules. Ask when the decision is required for implementation. See [`.ai/OPEN_QUESTIONS.md`](./.ai/OPEN_QUESTIONS.md).

## 22. Testing

Every feature should consider: happy path, validation, authorization, unauthorized access, edge cases, empty/error states, mobile/responsive behavior, data consistency, audit behavior. Critical business flows should have automated tests where practical. See [`.ai/TESTING_STRATEGY.md`](./.ai/TESTING_STRATEGY.md).

## 23. Before Every Code Change — Checklist

```
[ ] Read CLAUDE.md
[ ] Read relevant .ai documentation
[ ] Inspect existing implementation
[ ] Identify affected modules
[ ] Check existing reusable components
[ ] Check business rules
[ ] Check permissions
[ ] Check security impact
[ ] Check database impact
[ ] Check API impact
[ ] Implement smallest clean solution
[ ] Test
[ ] Update documentation
[ ] Update changelog if meaningful
```

## 24. Never Do These Things

- Invent requirements
- Expand scope silently
- Hard-code configurable business values
- Bypass RBAC
- Expose sensitive applicant information
- Put secrets in source code
- Trust frontend-only authorization
- Create duplicate components unnecessarily
- Replace working architecture without reason
- Copy unrelated AdminCN demo functionality
- Make unsupported business decisions
- Delete requirements from documentation
- Modify production configuration casually
- Perform destructive database operations without explicit approval

## 25. Project Documentation Entry Point

Detailed project knowledge lives in [`.ai/README.md`](./.ai/README.md). When unsure which documentation file to read, start there.

## 26. Communication Style

Be concise but technically precise. For implementation tasks, explain: what you understood, what you will change, what files are affected, any risks — then implement. Avoid unnecessary generic explanations.

## 27. Final Rule

Think like a senior product engineer responsible for a government/enterprise portal. Prioritize, in order: **correctness, security, auditability, maintainability, consistency, scope control, user experience.**

Do not optimize for writing the most code. Optimize for building the correct system.
