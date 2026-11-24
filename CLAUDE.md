# InstaWedding T&P

Realtime wedding photo wall PWA. React 19 + Vite + Tailwind v4, Supabase (Postgres and Realtime), Cloudflare R2 and Vercel Functions.

## Commands (npm)

- `npm run check`: types, lint, tests and formatting. Run when done; prints only failures.
- `npx vitest run <file> --reporter=dot`: a single test file
- `npm run build`: production build
- `npm run dev`: local server (Vite, does not serve `api/`)
- `npm run format`: fixes formatting

## Map

- `src/App.tsx`: routes `/`, `/capture`, `/challenges`, `/admin` and `/projector` (outside `AppLayout`)
- `src/features/<name>/`: screens already split (Admin, Feed, Projector): page, `components/`, `hooks/` and `utils/`
- `src/pages/`: remaining screens. Capture is huge: grep for the section, do not read it whole
- `src/types/domain.ts`: models and DTOs
- `src/services/contracts/`: interfaces; implementations in `mock/`, `supabase/`, `r2/` and `api/`
- `src/services/api/api.client.ts`: calls to the admin API
- `src/services/*.factory.ts`: pick the mock or real implementation
- `src/services/offline-queue.service.ts`: background and offline uploads
- `src/utils/`: compression, filters, video, ZIP and guest session
- `src/index.css`: Tailwind theme (`sage` and `gold` colors)
- `api/`: Vercel Functions (rules in `api/CLAUDE.md`)
- `supabase/migrations/`: schema (rules in `supabase/CLAUDE.md`)
- `docs/DEPLOY.md`: deployment and environment variables

## Recipes

**New Post field:** `src/types/domain.ts` → migration → `src/services/mock/mock-post.repository.ts` → `src/services/supabase/supabase-post.repository.ts` (row, `createPost`, `mapRowToPost`) → `src/services/supabase/supabase-realtime.service.ts` (has its own mapping) → UI.

**New service method:** contract → mock → real implementation. Components get services only through factories.

## Conventions

- Write code, comments, docs and commit messages in English; UI text and user-facing messages in Portuguese (pt-BR). Chat with the author in pt-BR
- Import with the `@/` alias; `import type` goes last (Prettier sorts)
- No `enum` or parameter properties (`erasableSyntaxOnly`)
- Domain properties are `readonly`
- Never use browser `alert`, `confirm` or `prompt`: use `useDialog`
- No re-export files (`index.ts`)

## Tests

- Vitest, in `*.test.ts(x)` next to the code. Default environment is node; add `// @vitest-environment jsdom` when the DOM or storage is needed
- Tests run on mocks with the network disabled. Page tests call `setupBrowser()` from `src/test/browser.ts`
- `src/pages/pages.smoke.test.tsx` protects the 5 pages during refactors: do not weaken it to make it pass

## Pitfalls

- Mocks are on unless `VITE_USE_MOCKS=false`
- `VITE_*` variables ship in the public bundle: never put secrets in them
- There is no `media_type` column in the schema; media type comes from the URL (`src/utils/video.ts`)
- Guests write posts and likes directly to Supabase under RLS (`client_session_id` = their auth user id); admin actions go through `adminRequest` to `api/admin/`. `/api/posts` does not exist
- RLS blocks updates and deletes silently (zero rows, no error): check the affected rows
- `/media/*` is a rewrite to R2, in `vercel.json` and in the `vite.config.ts` proxy
- Do not commit, push or open PRs: the author reviews and commits
