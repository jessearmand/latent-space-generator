# Review instructions

These instructions override default review guidance for this repository.
Read them as the highest-priority rules.

## What Important (🔴) means here

Reserve Important for findings that would break behavior in production,
leak credentials, or corrupt user data. Concretely:

- Logic bugs that compile and lint clean but produce wrong output
  (e.g. wrong fal.ai endpoint, missing model-specific parameter,
  cascading fallback that ignores `ServerKeysContext` availability)
- API key or token exposure: any path where `FAL_API_KEY`,
  `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, or a user's OAuth key could
  reach the client bundle, logs, or an unintended endpoint
- Proxy whitelist regressions in `server/index.ts` (new outbound host
  added without justification, or whitelist bypassed)
- Race conditions or unhandled error states in queue polling loops
  (`fal.queue.status` / `fal.queue.result`) that leave the UI stuck
- Type assertions (`as any`, `as unknown as ...`) hiding a real bug,
  not just patching `@fal-ai/client` type gaps
- Persisted state corruption in `ConfigContext` (localStorage shape
  changes without a migration / safe default)

Naming, structure, refactoring suggestions, and missing-test comments
are Nit at most.

## Cap the nits

Report at most **5** Nits per review. If you found more, summarize the
rest as "plus N similar items" in the review body. If everything you
found is a Nit, lead the summary with "No factual issues."

## Do not report

Anything CI already enforces. This repo runs `oxlint` (with eslint,
typescript, unicorn, oxc, react, jsx-a11y, import, vitest plugins),
`biome` (recommended rules + organize-imports), and `tsc -b`. Skip:

- Formatting, indentation, quote style, trailing commas, semicolons
- Unused imports / variables / parameters
- Import order or grouping
- React hook dependency arrays (oxlint catches these)
- Accessibility issues already covered by `jsx-a11y` rules
- Suggestions to use modern JS syntax (oxlint `unicorn` covers this)
- Plain TypeScript type errors (`tsc -b` covers this)
- Vitest patterns or matcher choices (oxlint `vitest` covers this)
- Style-only nits in `.css` files

Also skip:

- `bun.lock`, `package-lock.json`, `public/manifest.json`
- Anything under `build/`, `dist/`, or `node_modules/`
- Comment wording, JSDoc completeness, README polish

## Always check

These are project-specific invariants the linter cannot see:

- **Model category integrity**: when `ImageModelCategory` (or a video /
  audio category type) gains a member, `normalizeModel()` in
  `src/types/models.ts` and the parallel fetch in
  `src/services/models.ts` must be updated together. Flag a PR that
  updates one without the other.
- **Cascading fallback routing**: GPT image models route OpenAI →
  fal.ai → OpenRouter; Gemini image models route fal.ai → OpenRouter.
  Routing must consult `ServerKeysContext` before picking a backend.
  Flag any direct call that hard-codes one backend without the check.
- **Proxy security**: new outbound hosts in `server/index.ts` must be
  added to the fal.ai allowlist (or its OpenAI/OpenRouter equivalents)
  with a one-line reason. Flag a new `fetch(...)` to an unlisted host.
- **Queue polling shape**: any new model that uses `fal.queue.submit`
  must also handle `IN_QUEUE`, `IN_PROGRESS`, `COMPLETED`, and the
  error fall-through. Flag a polling loop missing the error branch.
- **Config persistence**: new fields added to `ConfigContext` must
  have a safe default when localStorage is empty or out-of-shape, so
  existing users do not crash on first load.
- **Bun runner**: tests run via `bun run test` (Vitest), never
  `bun test` (Bun's native runner — different semantics, will fail).
  Flag any docs or script that uses the wrong form.

## Verification bar

Before posting an Important finding, cite a `file:line` from the diff
or the surrounding code that demonstrates the bug. Inferred behavior
("this looks like it might..." without a citation) is not enough for
🔴 — downgrade to Nit or drop it.

## Re-review behavior

After the first review on a PR, suppress new Nits unless the change
introduced a fresh class of issue. Continue posting Important findings.

## Summary shape

Open the review body with a one-line tally:
`<N> important, <M> nits, <K> pre-existing`. If there are zero
Important findings, lead with "No factual issues."

<!--
CHOOSE points to revisit:
1. Nit cap (currently 5) — raise if you want more polish, lower if reviews feel noisy.
2. Re-review rule ("suppress new Nits after first round") — drop if you want
   continuous polish on long-running PRs.
3. The "Always check" list — add or remove items as the codebase evolves.
   Each item is a project-specific invariant the linter cannot enforce.
-->
