import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRegistrationDraft,
  getRegistrationProgress,
  isValidEmail,
  normalizeBusinessName,
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

test('creates a registration draft with safe defaults', () => {
  const draft = createRegistrationDraft({ businessName: ' Ayo Foods ' });

  assert.equal(draft.businessName, 'Ayo Foods');
  assert.equal(draft.language, 'en');
  assert.equal(draft.stage, 'data');
  assert.match(draft.id, /^reg-/);
});

test('reports the guided registration progress by stage', () => {
  assert.equal(getRegistrationProgress('data'), 20);
  assert.equal(getRegistrationProgress('documents'), 50);
  assert.equal(getRegistrationProgress('payment'), 75);
  assert.equal(getRegistrationProgress('registered'), 100);
});
