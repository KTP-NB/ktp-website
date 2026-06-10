  -- CodeRank harness-registry migration (durable record).
  --
  -- Context: the harness generator and judge are now driven by the per-question
  -- harness registry (lib/coderank/harnessRegistry.js). Generation keys off an
  -- explicit execution KIND (return_value, in_place_mutation, object_design,
  -- codec_round_trip_tree, clone_graph, copy_random_list, round_trip_strings,
  -- linked_list_cycle) rather than parameter/return types alone, and
  -- lib/coderank/grading.js resolves the judge mode from the same registry.
  --
  -- This file records the DB-side state changes. The bulky starter_code rewrites
  -- (replacing the 18 previously-baked full-program harnesses with bare snippets
  -- from lib/coderank/bareSnippets.js) and the full function_metadata refresh are
  -- applied idempotently by:
  --
  --     node --env-file=.env scripts/coderank/seed_profiles.mjs --commit
  --
  -- Run that script as part of this migration's deploy. The statements below are
  -- the minimal, reviewable flag/judge changes; running them is safe and
  -- idempotent even if the seed script has already run.

  begin;

  -- 1. The 18 previously-baked questions move onto the runtime-harness path. Their
  --    bare starter_code is written by seed_profiles.mjs; here we flip the flag.
  update public.cr_questions
  set use_runtime_harness = true
  where slug in (
    'rotate-image', 'set-matrix-zeroes', 'surrounded-regions', 'walls-and-gates', 'reorder-list',
    'min-stack', 'implement-trie-prefix-tree', 'design-add-and-search-words-data-structure',
    'time-based-key-value-store', 'kth-largest-element-in-a-stream', 'design-twitter',
    'find-median-from-data-stream', 'detect-squares', 'lru-cache',
    'encode-and-decode-strings', 'median-of-two-sorted-arrays', 'powx-n', 'merge-k-sorted-lists'
  );

  -- 2. Wire the custom judges that were silently dead (function_metadata.judge was
  --    null, so these graded as plain `exact` despite having many valid orderings).
  --    grading.js already overrides from the registry, but keep the DB honest.
  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"custom","checker":"alien_dictionary"}'::jsonb, true)
  where slug = 'alien-dictionary';

  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"custom","checker":"course_schedule_ii"}'::jsonb, true)
  where slug = 'course-schedule-ii';

  -- 3. The graph/codec/random specials were runtime questions misrouted through the
  --    generic return-value harness (e.g. serialize-and-deserialize-binary-tree's
  --    metadata claimed name "Codec"/return "string"; clone-graph claimed
  --    return "boolean"). seed_profiles.mjs rewrites their function_metadata to
  --    match the registry; the runtime path already uses the registry regardless.
  --    No flag change needed (they are already use_runtime_harness = true).

  -- 4. Accounts Merge has many valid groupings (outer + per-group email order).
  --    Wire its semantic checker. (No registry entry: grading.js falls back to
  --    this DB judge for slugs not in lib/coderank/harnessRegistry.js.)
  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"custom","checker":"accounts_merge"}'::jsonb, true)
  where slug = 'accounts-merge';

  -- 5. Audit: exact-mode questions whose answers are NOT unique. Each must grade
  --    order-insensitively or correct solutions fail. The harness registry is the
  --    runtime source of truth (already updated); these keep the DB consistent.
  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"unordered_triplets"}'::jsonb, true)
  where slug = '3sum';

  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"unordered_nested_array"}'::jsonb, true)
  where slug = 'group-anagrams';

  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"unordered_outer"}'::jsonb, true)
  where slug = 'permutations';

  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"unordered_intervals"}'::jsonb, true)
  where slug = 'merge-intervals';

  update public.cr_questions
  set function_metadata = jsonb_set(coalesce(function_metadata, '{}'::jsonb), '{judge}',
    '{"mode":"unordered_array"}'::jsonb, true)
  where slug = 'top-k-frequent-elements';

  -- Leftover audit note: every other registry slug returning a non-unique shape
  -- already carries an unordered/custom judge — combination-sum, subsets,
  -- subsets-ii, n-queens, k-closest-points-to-origin (unordered_nested_array);
  -- two-sum, letter-combinations, word-search-ii (unordered_array);
  -- alien-dictionary, course-schedule-ii (custom). No further exact-mode
  -- questions with non-unique answers remain.

  commit;
