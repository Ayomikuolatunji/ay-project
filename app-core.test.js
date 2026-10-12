import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRegistrationDraft,
  getRegistrationProgress,
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
