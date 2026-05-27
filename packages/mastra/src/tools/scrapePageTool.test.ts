import assert from 'node:assert/strict';
import test from 'node:test';
import { scrapePageTool } from './scrapePageTool';

test('scrapePageTool exposes a focused webpage extraction tool contract', () => {
  assert.equal(scrapePageTool.id, 'scrape-page');
  assert.match(scrapePageTool.description, /known webpage URLs/i);
});
