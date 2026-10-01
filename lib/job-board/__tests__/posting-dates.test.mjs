import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newYorkDate, newYorkDayBounds, newYorkMidnightIso } from '../postingDates.js';

test('posted today follows the New Brunswick calendar after UTC midnight', () => {
  const now = new Date('2026-09-29T00:47:00.000Z');
  assert.equal(newYorkDate(now), '2026-09-28');
  assert.deepEqual(newYorkDayBounds(now), {
    start: '2026-09-28T04:00:00.000Z',
    end: '2026-09-29T04:00:00.000Z',
  });
});

test('Eastern day boundaries account for both DST transitions', () => {
  assert.deepEqual(newYorkDayBounds('2026-03-08T17:00:00Z'), {
    start: '2026-03-08T05:00:00.000Z',
    end: '2026-03-09T04:00:00.000Z',
  });
  assert.deepEqual(newYorkDayBounds('2026-11-01T17:00:00Z'), {
    start: '2026-11-01T04:00:00.000Z',
    end: '2026-11-02T05:00:00.000Z',
  });
});

test('date-only postings use the actual Eastern midnight and reject invalid dates', () => {
  assert.equal(newYorkMidnightIso('2026-01-15'), '2026-01-15T05:00:00.000Z');
  assert.equal(newYorkMidnightIso('2026-07-15'), '2026-07-15T04:00:00.000Z');
  assert.equal(newYorkMidnightIso('2026-02-30'), null);
});
