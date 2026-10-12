# RegulAI client prototype

RegulAI is a client-side prototype for an AI-guided Nigerian business-registration and brand-building platform, based on the final project report in the workspace.

The product helps a new entrepreneur move from business idea to a clearer registration path:

- public landing page explaining the service;
- sign-in screen with validation and a demo account;
- guided business-name registration flow;
- business-name availability checks with local alternative suggestions;
- contextual registration guide for business details, documents, and filing;
- mock document quality checks with OCR-style confidence and resubmission flags for identity and passport-photo uploads;
- mock payment with a visible failure/retry path and application filing;
- five-stage application status dashboard with a detailed application timeline;
- local notifications for payment, document, verification, query, and registration updates;
- registered-stage demo certificate summary with deterministic BN/TIN values and local downloads;
- client-only admin review queue showing flagged documents and resubmission actions;
- localized workspace shell, tracker, and registration steps for English, Yorùbá, Hausa, and Igbo;
- repeatable demo reset from the workspace account control;
- keyboard-safe account popover and modal dialogs with focus looping and trigger restoration;
- branded Open Graph and Twitter share-card metadata for public links;
- interactive starter brand-kit preview personalized with a logo direction, company profile, and landing page concept;
- downloadable company-profile and landing-page templates generated from the same registration record.

This version is intentionally client-only and mock-heavy. It does not call the CAC, OCR, AI, payment, or database APIs. Application state is kept in browser `localStorage` so the flow can be demonstrated without a backend.

## Run locally

```bash
npm run dev
```

Then open [http://localhost:4173](http://localhost:4173).

`npm start` remains available as the production-style static preview command. Set `PORT` when another local server is already using 4173, for example `PORT=4174 npm run dev`.

## Verify

```bash
npm test
```

The automated tests cover the registration-state helpers, name availability, OCR-style document readiness, shared brand outputs, localized workspace copy, contextual registration guidance, and public share metadata. A manual browser smoke pass for this implementation covered the landing page, login validation, registration details, name suggestions, mock document checks, payment failure/retry, dashboard handoff, notifications, status progression, certificate outputs, brand-kit profile/landing outputs, the admin review/resubmission queue, language preference changes, the repeatable demo reset flow, and keyboard focus behavior for the account popover and modal dialogs.
