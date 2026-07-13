# Lint and Typecheck Remediation Report

## Baseline

Captured on 2026-07-13 from the current worktree before quality-only fixes.

| Gate | Command | Result |
| --- | --- | --- |
| Backend lint | `npm run lint` in `backend/` | Failed: 157 errors, 0 warnings |
| Backend typecheck | `npm run build` in `backend/` | Passed |
| Frontend direct typecheck | `npx tsc --noEmit` in `frontend/` | Failed: 5 errors |
| Frontend production build | `npm run build` in `frontend/` | Passed |

The frontend has no non-interactive lint script or ESLint configuration yet. `npx next lint` opens Next.js's interactive setup prompt, so it is not a reliable CI gate.

## Error groups and fix order

1. **Type/runtime correctness:** five frontend Playwright test annotations use `APIRequest` where the request context is `APIRequestContext`.
2. **React and package type alignment:** inspect the React 18 runtime versus the installed React type packages before enabling the frontend lint/typecheck gates.
3. **Explicit `any`:** approximately 141 backend occurrences, spread across controllers, repositories, services, and PDF/watermark helpers. Replace each with a concrete Prisma/domain type, `unknown` plus narrowing, or a narrow record type.
4. **Imports and unused bindings:** approximately 13 backend errors. Remove only bindings that are demonstrably unused.
5. **Other mechanical lint findings:** one constant-condition loop, two CommonJS `require` calls, and one irregular whitespace occurrence.
6. **Hooks/style:** no frontend hook/dead-code/style violations can be measured until a non-interactive frontend ESLint gate is configured.

## Highest-concentration and high-risk files

| File | Baseline finding | Risk |
| --- | ---: | --- |
| `backend/src/modules/signRequests/signRequests.service.ts` | 27 | High: signing workflow; apply only narrow type/import fixes |
| `backend/src/modules/users/users.controller.ts` | 25 | Medium: request parsing and authorization responses |
| `backend/src/modules/documents/pdfGeneration.service.ts` | 10 | Medium: document rendering integration values |
| `backend/src/modules/approvals/approvals.service.ts` | 10 | Medium: approval state transitions |
| `backend/src/modules/settings/settings.service.ts` | 7 | Low/medium: settings serialization |
| `backend/src/modules/workflows/workflows.service.ts` | 8 | High: workflow state; avoid structural changes |

## Remediation constraints

- No lint/typecheck suppression, ignore flag, `@ts-ignore`, or `eslint-disable` will be added to conceal failures.
- Do not redesign UI, change business behavior, or broadly rewrite signing, document, public-signing, or workflow modules.
- Verify each group with the normal test, lint, typecheck, and build commands before staging only quality-gate files.

## Final verification

| Gate | Result |
| --- | --- |
| Backend lint | Passed: 0 errors, 0 warnings |
| Backend build | Passed |
| Backend unit tests | Passed: 64/64 |
| Frontend lint | Passed: 0 errors; legacy warnings remain |
| Frontend typecheck | Passed |
| Frontend build | Passed |

The backend moved from 157 lint errors to zero. The frontend had five direct
TypeScript errors caused by the incorrect Playwright request type and 17 lint
errors after its first non-interactive Next.js lint run; both are now zero.

Remaining frontend warnings are intentionally visible rather than suppressed:
React hook dependency notices, `next/image` migration notices, and one missing
image-alt notice. They do not fail the restored lint gate and require separate
behavior/UI review because several are in signing and approval pages.
