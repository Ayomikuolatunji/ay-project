import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const landingMarkup = readFileSync(join(projectRoot, 'index.html'), 'utf8');
const landingStyles = readFileSync(join(projectRoot, 'styles.css'), 'utf8');
const appSource = readFileSync(join(projectRoot, 'app.js'), 'utf8');

function sectionMarkup(id) {
  const match = landingMarkup.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>[\\s\\S]*?<\\/section>`));
  assert.ok(match, `Expected landing section #${id}`);
  return match[0];
}

function cssBlock(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = landingStyles.match(new RegExp(`(?:^|\\n)${escapedSelector}\\s*\\{([^}]*)\\}`));
  assert.ok(match, `Expected CSS rule ${selector}`);
  return match[1];
}

test('landing page explains the four report-focused parts of the client demo', () => {
  for (const sectionId of ['founder-path', 'document-confidence', 'business-ready', 'faq']) {
    sectionMarkup(sectionId);
  }

  assert.match(sectionMarkup('founder-path').replace(/<[^>]+>/g, ' '), /For the person doing this\s+for the first time/i);
  assert.match(sectionMarkup('document-confidence').replace(/<[^>]+>/g, ' '), /Document readiness,\s+clearly explained/i);
  assert.match(sectionMarkup('business-ready').replace(/<[^>]+>/g, ' '), /What you\s+leave with/i);
  assert.match(sectionMarkup('faq').replace(/<[^>]+>/g, ' '), /Frequently asked\s+questions/i);
});

test('hero title can reflow inside narrow viewports', () => {
  assert.match(landingMarkup, /class="hero-title"/);
  assert.doesNotMatch(landingMarkup, /<h1>Register the business\.<br/);
  assert.match(cssBlock('.hero-title'), /min-width:\s*0;/);
  assert.match(cssBlock('.hero-title'), /overflow-wrap:\s*anywhere;/);
  assert.match(cssBlock('.hero-title em'), /max-width:\s*100%;/);
  assert.match(cssBlock('.hero-title br'), /display:\s*none;/);
});

test('hero progress labels wrap instead of colliding at readable sizes', () => {
  assert.match(cssBlock('.preview-stages'), /grid-template-columns:\s*repeat\(3,/);
  assert.match(cssBlock('.preview-stages span'), /overflow-wrap:\s*anywhere;/);
});

test('new landing sections use semantic groups and working registration CTAs', () => {
  const founder = sectionMarkup('founder-path');
  const documentConfidence = sectionMarkup('document-confidence');
  const businessReady = sectionMarkup('business-ready');
  const faq = sectionMarkup('faq');

  assert.match(founder, /aria-labelledby="founder-path-note-title"/);
  assert.match(founder, /id="founder-path-note-title"/);
  assert.match(founder, /data-route="register"/);
  assert.match(documentConfidence, /aria-labelledby="readiness-preview-title"/);
  assert.match(documentConfidence, /id="readiness-preview-title"/);
  assert.match(businessReady, /class="business-ready-mark" aria-hidden="true"/);
  assert.match(businessReady, /data-route="register"/);
  assert.match(faq, /<details open>/);
});

test('document flow uses browser PDF text parsing instead of image scanning', () => {
  assert.match(appSource, /pdfjs-dist@6\.3\.289\/build\/pdf\.min\.mjs/);
  assert.match(appSource, /GlobalWorkerOptions\.workerSrc/);
  assert.match(appSource, /getDocument\(/);
  assert.match(appSource, /analyzePdfText/);
  assert.match(appSource, /Scanned or image-only PDFs are not supported/);
});
