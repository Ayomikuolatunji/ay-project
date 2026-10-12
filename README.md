# RegulAI client prototype

RegulAI is a client-side prototype for an AI-guided Nigerian business-registration and brand-building platform, based on the final project report in the workspace.

The product helps a new entrepreneur move from business idea to a clearer registration path:

- public landing page explaining the service;
- sign-in screen with validation and a demo account;
- guided business-name registration flow;
- mock document quality checks for identity and passport-photo uploads;
- mock payment and application filing;
- five-stage application status dashboard;
- language selector for English, Yorùbá, Hausa, and Igbo;
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

The automated tests cover the registration-state helpers. The browser smoke pass covers the landing page, mobile landing page, login validation, registration details, mock document checks, mock payment, dashboard handoff, and brand-kit preview interactions.
