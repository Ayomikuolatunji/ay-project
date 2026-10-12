import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const indexMarkup = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

test('exposes share metadata and a branded 1200 by 630 social image', () => {
  assert.match(indexMarkup, /<meta property="og:type" content="website"\s*\/?\s*>/);
  assert.match(indexMarkup, /<meta property="og:title" content="RegulAI — Register the business\. Build the brand\."\s*\/?\s*>/);
  assert.match(indexMarkup, /<meta property="og:image" content="https:\/\/regulai-psi\.vercel\.app\/og-image\.png"\s*\/?\s*>/);
  assert.match(indexMarkup, /<meta name="twitter:card" content="summary_large_image"\s*\/?\s*>/);

  const imageMarkup = fs.readFileSync(path.join(projectRoot, 'og-image.svg'), 'utf8');
  assert.match(imageMarkup, /<svg[^>]*width="1200"[^>]*height="630"/);
  assert.match(imageMarkup, /RegulAI/);
});
