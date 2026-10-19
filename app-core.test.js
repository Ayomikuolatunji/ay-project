import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRegistrationDraft,
  createBrandAssets,
  checkBusinessNameAvailability,
  createBrandKit,
  getRegistrationProgress,
  getApplicationTimeline,
  getRegistrationGuidance,
  getLocalizedCopy,
  getRegulAIReply,
  getNextApplicationStage,
  analyzePdfText,
  validateDocumentFile,
  verifyDocumentReadiness,
  canAdvanceToPayment,
  analyzeBusinessIdea,
  getDashboardMetrics,
  isValidEmail,
  normalizeBusinessName,
  validateRegistrationDetails,
} from './app-core.js';

test('normalizes a business name for consistent mock registration data', () => {
  assert.equal(normalizeBusinessName('  Ayo  Foods  '), 'Ayo Foods');
  assert.equal(normalizeBusinessName(''), '');
});

test('validates the email used to enter the client portal', () => {
  assert.equal(isValidEmail('ayo@example.com'), true);
  assert.equal(isValidEmail('ayo@'), false);
  assert.equal(isValidEmail(''), false);
});

test('creates a registration draft with the details needed for review', () => {
  const draft = createRegistrationDraft({
    businessName: ' Ayo Foods ',
    businessType: 'Limited Company (Ltd)',
    description: 'A neighbourhood food business',
    serviceList: 'Meals, Catering',
    contactEmail: 'hello@ayo.example',
    contactPhone: '+234 800 000 0000',
  });

  assert.equal(draft.businessName, 'Ayo Foods');
  assert.equal(draft.businessType, 'Limited Company (Ltd)');
  assert.equal(draft.description, 'A neighbourhood food business');
  assert.equal(draft.serviceList, 'Meals, Catering');
  assert.equal(draft.contactEmail, 'hello@ayo.example');
  assert.equal(draft.contactPhone, '+234 800 000 0000');
  assert.equal(draft.language, 'en');
  assert.equal(draft.stage, 'data');
  assert.equal(draft.brandKit.themeId, 'meadow');
  assert.match(draft.id, /^reg-/);
});

test('validates the minimum business details before the wizard advances', () => {
  assert.deepEqual(validateRegistrationDetails({ businessName: '', businessType: 'Business Name' }), {
    businessName: 'Add a business name or idea to continue.',
  });
  assert.deepEqual(validateRegistrationDetails({ businessName: 'Ayo Foods', businessType: 'Unknown' }), {
    businessType: 'Choose a valid registration type to continue.',
  });
  assert.deepEqual(validateRegistrationDetails({ businessName: 'Ayo Foods', businessType: 'Business Name' }), {});
});

test('reports the guided registration progress by stage', () => {
  assert.equal(getRegistrationProgress('data'), 20);
  assert.equal(getRegistrationProgress('documents'), 20);
  assert.equal(getRegistrationProgress('payment'), 75);
  assert.equal(getRegistrationProgress('registered'), 100);
});

test('derives the application timeline state from the current stage', () => {
  const timeline = getApplicationTimeline('verifying', {
    data: '2026-10-19T08:00:00.000Z',
    payment: '2026-10-19T08:05:00.000Z',
    verifying: '2026-10-19T08:10:00.000Z',
  });

  assert.deepEqual(timeline.map((item) => [item.id, item.status]), [
    ['data', 'complete'],
    ['payment', 'complete'],
    ['verifying', 'current'],
    ['waiting', 'upcoming'],
    ['registered', 'upcoming'],
  ]);
  assert.equal(timeline[2].label, 'Verifying');
  assert.equal(timeline[2].timestamp, '2026-10-19T08:10:00.000Z');
  assert.match(timeline[2].note, /document check/i);
  assert.equal(getApplicationTimeline('unknown')[0].status, 'current');
});

test('returns contextual guidance for a registration step with a safe fallback', () => {
  assert.deepEqual(['data', 'documents', 'payment'].map((step) => getRegistrationGuidance(step).id), ['data', 'documents', 'payment']);
  const documents = getRegistrationGuidance('documents');

  assert.equal(documents.id, 'documents');
  assert.equal(documents.title, 'Let’s get your documents ready.');
  assert.equal(documents.items[0].title, 'Identity document');
  assert.match(documents.items[0].body, /government-issued/i);
  assert.equal(getRegistrationGuidance('unknown').id, 'data');
});

test('returns localized workspace copy with a safe English fallback', () => {
  const yoruba = getLocalizedCopy('yo');
  const english = getLocalizedCopy('en');

  assert.equal(yoruba.dashboard.continueRegistration, 'Tẹ̀síwájú ìforúkọsílẹ̀');
  assert.equal(yoruba.tracker.verifying, 'A ń ṣàyẹ̀wò');
  assert.equal(yoruba.steps.documents, 'Àyẹ̀wò ìwé');
  assert.equal(yoruba.registration.documents.items[0].title, 'Ìwé ìdánimọ̀ tí ìjọba fún');
  assert.equal(getLocalizedCopy('unknown').dashboard.heading, english.dashboard.heading);
});

test('returns grounded guidance for the dashboard assistant topics', () => {
  assert.match(getRegulAIReply('What documents do I need?'), /government-issued identity document/i);
  assert.match(getRegulAIReply('How long does registration take?'), /dashboard shows each stage/i);
  assert.match(getRegulAIReply('How much is payment?'), /₦25,000 sandbox filing fee/i);
  assert.match(getRegulAIReply('hello'), /documents, timing, payment, or your current application status/i);
  assert.match(getRegulAIReply('What documents do I need?', 'yo'), /ìwé|passport/i);
  assert.match(getRegulAIReply('Wane takardu zan shirya?', 'ha'), /takardar|fasfo/i);
  assert.match(getRegulAIReply('Ego ole ka a ga-akwụ?', 'ig'), /₦25,000|sandbox/i);
});

test('checks document type and size before marking a file ready', () => {
  assert.deepEqual(validateDocumentFile({
    documentType: 'identity',
    name: 'national-id.pdf',
    mimeType: 'application/pdf',
    size: 1_200_000,
  }), { valid: true, message: 'File looks ready.' });
  assert.deepEqual(validateDocumentFile({
    documentType: 'passport',
    name: 'passport.pdf',
    mimeType: 'application/pdf',
    size: 400_000,
  }), { valid: false, message: 'Use a JPG or PNG image for the passport photograph.' });
  assert.deepEqual(validateDocumentFile({
    documentType: 'identity',
    name: 'large-id.pdf',
    mimeType: 'application/pdf',
    size: 6_000_000,
  }), { valid: false, message: 'Keep each document under 5 MB.' });
  assert.deepEqual(validateDocumentFile({
    documentType: 'identity',
    name: 'scanned-id.jpg',
    mimeType: 'image/jpeg',
    size: 900_000,
  }), { valid: false, message: 'Use a selectable-text PDF for the identity document. Scanned image files are not supported.' });
});

test('creates a personalized brand direction from the registration details', () => {
  const brandKit = createBrandKit({
    businessName: " Ayo's Table ",
    description: 'Neighbourhood meals for good company.',
    themeId: 'sunset',
  });

  assert.equal(brandKit.businessName, "Ayo's Table");
  assert.equal(brandKit.initials, 'AT');
  assert.equal(brandKit.descriptor, 'Neighbourhood meals for good company');
  assert.equal(brandKit.theme.id, 'sunset');
  assert.equal(brandKit.theme.label, 'Sunset studio');
  assert.equal(createBrandKit({ businessName: 'Ayo Foods', themeId: 'unknown' }).theme.id, 'meadow');
});

test('checks demo business-name availability and suggests alternatives', () => {
  const unavailable = checkBusinessNameAvailability('Zenith Traders');
  const available = checkBusinessNameAvailability('NorthGate Foods');

  assert.equal(unavailable.status, 'unavailable');
  assert.match(unavailable.message, /already registered/i);
  assert.deepEqual(unavailable.suggestions, ['Zenith Trade Hub', 'Zenith Point Traders']);
  assert.equal(available.status, 'available');
  assert.match(available.message, /available/i);
});

test('turns a plain-language business idea into grounded compliance guidance', () => {
  const analysis = analyzeBusinessIdea({
    businessName: 'AyoStyle',
    description: 'I sell fashion products online and deliver clothing across Nigeria.',
    serviceList: 'Ready-to-wear clothing, online delivery',
  });

  assert.equal(analysis.category, 'Retail & e-commerce');
  assert.equal(analysis.recommendedRegistration, 'Business Name');
  assert.equal(analysis.nameRisk.label, 'Low');
  assert.equal(analysis.rejectionRisk.label, 'Low');
  assert.equal(analysis.suggestions.length, 4);
  assert.equal(analysis.suggestions[0].name, 'AyoStyle Ventures');
  assert.ok(analysis.clauses.some((clause) => clause.title === 'Business objectives'));
  assert.equal(analysis.legalReferences[0].label, 'CAMA 2020 · Section 27');
});

test('keeps compliance name suggestions grounded in the local checker', () => {
  const unavailable = analyzeBusinessIdea({
    businessName: 'Dangote Ventures',
    description: 'I sell household products through a retail store.',
  });
  const unnamed = analyzeBusinessIdea({
    description: 'I provide professional services to small businesses.',
  });

  assert.equal(unavailable.nameRisk.label, 'High');
  assert.equal(unavailable.suggestions[0].name, 'Dangoti Ventures');
  assert.equal(unavailable.suggestions[0].availability, 'Local check passed');
  assert.ok(unnamed.suggestions.every((suggestion) => !suggestion.name.includes('Ayo')));
  assert.ok(unnamed.suggestions.every((suggestion) => suggestion.availability === 'Suggested starting point'));
});

test('returns dashboard metrics from the local registration state', () => {
  const metrics = getDashboardMetrics({
    stage: 'waiting',
    businessName: 'Ayo Foods',
  });

  assert.deepEqual(metrics, {
    totalApplications: 1,
    systemStatus: 'Active',
    estimatedApprovalTime: '24 hours',
    currentStage: 'Waiting for CAC',
  });
});

test('parses selectable PDF text into identity fields without claiming biometric verification', () => {
  const passed = analyzePdfText({
    text: [
      'FULL NAME',
      'AYODELE MIRACLE PETER',
      'DATE OF BIRTH',
      '12/03/1994',
      'ID NUMBER',
      'NIN 12345678901',
    ].join('\n'),
    pageCount: 2,
  });

  assert.equal(passed.status, 'passed');
  assert.equal(passed.parser, 'pdfjs-text');
  assert.equal(passed.confidence, 0.98);
  assert.equal(passed.extractedFields.fullName, 'AYODELE MIRACLE PETER');
  assert.equal(passed.extractedFields.dateOfBirth, '12/03/1994');
  assert.equal(passed.extractedFields.documentNumber, 'NIN 12345678901');
  assert.equal(passed.legibility, 'pass');
  assert.equal(passed.completeness, 'complete');
  assert.equal(passed.format, 'pdf-text');
  assert.equal(passed.pageCount, 2);
  assert.equal(passed.biometricVerification, false);
});

test('flags PDFs without selectable text or required identity fields', () => {
  const imageOnly = analyzePdfText({ text: '', pageCount: 1 });
  const incomplete = analyzePdfText({
    text: 'FULL NAME\nAyo Olatunji\nADDRESS\nLagos',
    pageCount: 1,
  });

  assert.equal(imageOnly.status, 'unsupported');
  assert.equal(imageOnly.legibility, 'no-text');
  assert.match(imageOnly.message, /selectable text|scanned/i);
  assert.equal(incomplete.status, 'flagged');
  assert.equal(incomplete.completeness, 'incomplete');
  assert.ok(incomplete.confidence < 0.98);
  assert.equal(incomplete.biometricVerification, false);
});

test('keeps passport photo checks separate from PDF text parsing', () => {
  const flagged = verifyDocumentReadiness({
    documentType: 'passport',
    name: 'blurry-id.jpg',
    mimeType: 'image/jpeg',
    size: 900_000,
  });

  assert.equal(flagged.status, 'flagged');
  assert.ok(flagged.confidence < 0.75);
  assert.equal(flagged.legibility, 'flagged');
  assert.equal(flagged.completeness, 'unknown');
  assert.match(flagged.message, /clear|re-upload/i);
});

test('rejects identity images before the PDF parser can run', () => {
  const scanned = verifyDocumentReadiness({
    documentType: 'identity',
    name: 'scanned-id.jpg',
    mimeType: 'image/jpeg',
    size: 900_000,
  });

  assert.equal(scanned.status, 'unsupported');
  assert.match(scanned.message, /selectable-text PDF|scanned image/i);
  assert.equal(scanned.biometricVerification, false);
});

test('flags incomplete and failed OCR results without treating them as identity verification', () => {
  const incomplete = analyzePdfText({
    text: 'FULL NAME\nAyo Olatunji\nADDRESS\nLagos',
    pageCount: 1,
  });
  const failed = analyzePdfText({ text: '', pageCount: 1 });

  assert.equal(incomplete.status, 'flagged');
  assert.equal(incomplete.completeness, 'incomplete');
  assert.equal(incomplete.biometricVerification, false);
  assert.equal(failed.status, 'unsupported');
  assert.equal(failed.legibility, 'no-text');
  assert.equal(failed.biometricVerification, false);
});

test('blocks payment until both documents pass the OCR readiness check', () => {
  assert.equal(canAdvanceToPayment({ identity: 'passed', passport: 'passed' }), true);
  assert.equal(canAdvanceToPayment({ identity: 'flagged', passport: 'passed' }), false);
  assert.equal(canAdvanceToPayment({ identity: 'passed', passport: 'pending' }), false);
  assert.equal(canAdvanceToPayment({ identity: 'failed', passport: 'passed' }), false);
});

test('keeps generated brand outputs consistent with one registration record', () => {
  const assets = createBrandAssets({
    businessName: 'Bloom & Harmony Wellness',
    description: 'Plant-based wellness products for everyday self-care.',
    serviceList: 'Natural skincare, Wellness consultation, Herbal tea blends',
    contactEmail: 'hello@bloomharmony.example',
    contactPhone: '+234 800 000 0000',
    themeId: 'indigo',
  });

  assert.equal(assets.brand.businessName, 'Bloom & Harmony Wellness');
  assert.equal(assets.profile.businessName, assets.landing.businessName);
  assert.deepEqual(assets.profile.services, ['Natural skincare', 'Wellness consultation', 'Herbal tea blends']);
  assert.equal(assets.landing.tagline, assets.brand.descriptor);
  assert.equal(assets.profile.contactEmail, 'hello@bloomharmony.example');
});

test('keeps the demo registration number aligned across brand outputs', () => {
  const assets = createBrandAssets({
    businessName: 'Ayo Foods',
    description: 'Neighbourhood meals for good company.',
    registrationNumber: 'BN-1234567',
  });

  assert.equal(assets.profile.registrationNumber, 'BN-1234567');
});

test('advances demo application status one stage at a time', () => {
  assert.equal(getNextApplicationStage('data'), 'payment');
  assert.equal(getNextApplicationStage('documents'), 'payment');
  assert.equal(getNextApplicationStage('verifying'), 'waiting');
  assert.equal(getNextApplicationStage('waiting'), 'registered');
  assert.equal(getNextApplicationStage('registered'), 'registered');
  assert.equal(getNextApplicationStage('unknown'), 'data');
});
