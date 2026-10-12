# RegulAI client prototype

RegulAI is a client-side prototype for an AI-guided Nigerian business-registration and brand-building platform, based on the final project report in the workspace.

The product helps a new entrepreneur move from business idea to a clearer registration path:

- public landing page explaining the service;
- sign-in screen with validation and a demo account;
- guided business-name registration flow;
- contextual registration guide for business details, documents, and filing;
- mock document quality checks for identity and passport-photo uploads;
- mock payment and application filing;
- five-stage application status dashboard with a detailed application timeline;
- localized workspace shell, tracker, and registration steps for English, Yorùbá, Hausa, and Igbo;
- repeatable demo reset from the workspace account control;
- keyboard-safe account popover and modal dialogs with focus looping and trigger restoration;
- branded Open Graph and Twitter share-card metadata for public links;
- interactive starter brand-kit preview personalized with a logo direction, company profile, and landing page concept.

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

The automated tests cover the registration-state helpers, localized workspace copy, contextual registration guidance, and public share metadata. The browser smoke pass covers the landing page, mobile landing page, login validation, registration details, mock document checks, mock payment, dashboard handoff, brand-kit preview interactions, application timeline states, language preference changes on desktop and mobile, desktop/mobile registration guide behavior, the repeatable demo reset flow, and keyboard focus behavior for the account popover and modal dialogs.
