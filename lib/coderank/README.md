# CodeRank harness generator

`harness.js` produces a full runnable program from three inputs:

```js
import { generateHarness } from '@/lib/coderank/harness';

const code = generateHarness({
  language: 'java',          // 'python' | 'javascript' | 'java'
  bareSnippet: '...',        // LeetCode-style Solution snippet stored in cr_questions
  functionMetadata: {
    name: 'containsDuplicate',
    params: [{ name: 'nums', type: 'int[]' }],
    return: { type: 'boolean' },
  },
  orderInsensitive: false,   // true for problems like Group Anagrams
});
```

The returned string is what the frontend sends to `${NEXT_PUBLIC_CODERANK_API_URL}/api/run` (or `/api/submit`). The user only ever sees `bareSnippet` in the Monaco editor.

## Stdin / stdout contract

- **Stdin** (set by `cr_test_cases.stdin`): a JSON object keyed by parameter name, e.g. `{"nums":[1,2,3,1]}`. The harness parses this and passes each value to the solution method.
- **Stdout** (compared against `cr_test_cases.expected_stdout`):
  - `boolean` → `true` / `false`
  - `int` → decimal digits
  - `string` → raw text (no surrounding quotes)
  - any array type → JSON form (`[1,2,3]`, `[[1,2],[3,4]]`)
  - `ListNode` return → flat int array (`[1,2,3]`)
  - `TreeNode` return → level-order array with `null` for missing children (`[3,9,20,null,null,15,7]`)

`orderInsensitive: true` sorts the output before serialization (used for problems where any permutation is accepted).

## Canonical types

`functionMetadata` uses these canonical strings. A normalizer accepts common aliases (`Boolean`, `List<Integer>`, etc.) and folds them to canonical form.

| Canonical          | Java                  | Python type hint |
|--------------------|-----------------------|------------------|
| `boolean`          | `boolean`             | `bool`           |
| `int`              | `int`                 | `int`            |
| `string`           | `String`              | `str`            |
| `int[]`            | `int[]`               | `List[int]`      |
| `string[]`         | `String[]`            | `List[str]`      |
| `int[][]`          | `int[][]`             | `List[List[int]]`|
| `string[][]`       | `String[][]`          | `List[List[str]]`|
| `ListNode`         | `ListNode`            | `ListNode`       |
| `TreeNode`         | `TreeNode`            | `TreeNode`       |

## Adding a new language

1. Add the canonical name to `SUPPORTED_LANGUAGES` in `harness.js`.
2. Write a `buildXxx({ bareSnippet, meta, orderInsensitive })` function that returns the full program string. Use the existing three builders as templates — each one needs:
   - The bare snippet inlined as-is
   - A stdin reader that parses the JSON-object format
   - Per-parameter parsing into language-native types
   - An invocation of `Solution().<methodName>(...)` (or the language equivalent)
   - Output serialization matching the stdout contract above
   - `ListNode`/`TreeNode` constructors and round-trip helpers
   - `normalizeArray` / `normalizeNested` for order-insensitive problems
3. Register it in `LANGUAGE_BUILDERS`.
4. Make sure the Piston backend (`PISTON_URL`) actually has that runtime installed — check `GET /api/v2/runtimes` on the Piston instance before promoting.
5. Add a row in the test matrix in `scripts/test_harness_contains_duplicate.js` (or whatever the current verification entry point is) and run it before shipping.

## Rollback (when something breaks at 2am)

The runtime-harness path is gated per question. To revert a single bad question to the legacy `executableCodeForEditor` path without touching anything else:

```sql
update public.cr_questions set use_runtime_harness = false where slug = '<bad-slug>';
```

That's it — no deploy, no schema change. Next Run/Submit on that question goes back through the old wrap logic. In-flight attempts on other questions are unaffected.

For a full refactor rollback (abandoning the new path entirely), apply `supabase/migrations/20260524_coderank_runtime_harness_down.sql` — but that destroys all backfilled `function_metadata`, so prefer the per-question flag flip first.

## Why a runtime generator?

`cr_questions.starter_code` used to store the full harness per language per problem. A bug in the harness (e.g. the `fast.next !== null` issue in Linked List Cycle) meant editing every row. With this module, one fix in the generator propagates to every problem. The database eventually stores only the bare `Solution` snippet — byte-identical to LeetCode's GraphQL `codeSnippets` output — plus a `function_metadata` JSONB column describing the signature.
