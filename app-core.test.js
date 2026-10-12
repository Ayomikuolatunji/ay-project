import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRegistrationDraft,
  createBrandKit,
  getRegistrationProgress,
  getApplicationTimeline,
  getRegulAIReply,
  validateDocumentFile,
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
  });

  assert.equal(draft.businessName, 'Ayo Foods');
  assert.equal(draft.businessType, 'Limited Company (Ltd)');
  assert.equal(draft.description, 'A neighbourhood food business');
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

test('returns grounded guidance for the dashboard assistant topics', () => {
  assert.match(getRegulAIReply('What documents do I need?'), /government-issued identity document/i);
  assert.match(getRegulAIReply('How long does registration take?'), /dashboard shows each stage/i);
  assert.match(getRegulAIReply('How much is payment?'), /₦25,000 sandbox filing fee/i);
  assert.match(getRegulAIReply('hello'), /documents, timing, payment, or your current application status/i);
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
