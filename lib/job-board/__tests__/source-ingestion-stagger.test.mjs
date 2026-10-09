import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync(new URL('../../../supabase/migrations/20261001190000_stagger_airtable_sources.sql', import.meta.url), 'utf8');

test('Airtable Cron dispatches one enabled source per minute without overlapping providers', () => {
  assert.match(migration, /'15-59 7 \* \* \*'/);
  assert.match(migration, /'15-59 8 \* \* \*'/);
  for (const provider of ['intern_list', 'new_grad_jobs']) {
    assert.match(migration, new RegExp(`where provider = '${provider}' and enabled = true[\\s\\S]*?offset v_slot limit 1`));
  }
  assert.equal((migration.match(/perform net\.http_post\(/g) || []).length, 2);
  assert.match(migration, /jsonb_build_object\('sourceId', v_source_id\)/);
  assert.match(migration, /jsonb_build_object\('sourceId', v_source_id, 'provider', 'new_grad_jobs'\)/);
});
