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
  validateDocumentFile,
  verifyDocumentReadiness,
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
  assert.equal(getRegistrationProgress('documents'), 50);
  assert.equal(getRegistrationProgress('payment'), 75);
  assert.equal(getRegistrationProgress('registered'), 100);
});

test('derives the application timeline state from the current stage', () => {
  const timeline = getApplicationTimeline('verifying');

  assert.deepEqual(timeline.map((item) => [item.id, item.status]), [
    ['data', 'complete'],
    ['payment', 'complete'],
    ['verifying', 'current'],
    ['waiting', 'upcoming'],
    ['registered', 'upcoming'],
  ]);
  assert.equal(timeline[2].label, 'Verifying');
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
    name: 'large-id.jpg',
    mimeType: 'image/jpeg',
    size: 6_000_000,
  }), { valid: false, message: 'Keep each document under 5 MB.' });
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

test('returns an OCR-style readiness result for clear and unclear demo documents', () => {
  const passed = verifyDocumentReadiness({
    documentType: 'identity',
    name: 'ayo-identity.pdf',
    mimeType: 'application/pdf',
    size: 1_200_000,
  });
  const flagged = verifyDocumentReadiness({
    documentType: 'identity',
    name: 'blurry-id.jpg',
    mimeType: 'image/jpeg',
    size: 900_000,
  });

  assert.equal(passed.status, 'passed');
  assert.equal(passed.confidence, 0.96);
  assert.equal(passed.extractedFields.fullName, 'Ayo Olatunji');
  assert.equal(flagged.status, 'flagged');
  assert.ok(flagged.confidence < 0.75);
  assert.match(flagged.message, /clear|re-upload/i);
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
