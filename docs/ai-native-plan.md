# Action plan: AI native repository

**Goal:** the agent finds things fast, reads little and verifies itself, with no change in app behavior.

**How to use:** one phase per session. Ask "execute phase N of docs/ai-native-plan.md", check items off and run `/clear` before the next one. The author reviews and commits.

## Baseline (2026-11-23)

Tokens estimated as bytes / 4.

| Metric                 | Baseline                  | Target                   |
| ---------------------- | ------------------------- | ------------------------ |
| Versioned text         | 628 KB (~157k tokens)     | track only               |
| Largest file in `src/` | 58.5 KB (`AdminPage.tsx`) | up to 15 KB              |
| Four largest pages     | 200 KB (~50k tokens)      | up to 10 KB each         |
| Files failing Prettier | 25                        | 0                        |
| oxlint warnings        | 6 (`set-state-in-effect`) | 0 or justified           |
| Tests                  | 0                         | critical modules covered |
| `CLAUDE.md`            | missing                   | up to 60 lines           |

## Rules

- Do not mix formatting, file moves and logic changes in the same commit.
- A bug found while refactoring goes to "Findings"; do not fix it along the way.
- Every phase ends with `npm run check` and `npm run build` passing.
- Nothing is applied to production or Supabase without approval.

## Phase 0: Decisions

- [x] **Package manager:** npm
- [x] **Netlify:** not used; remove `netlify.toml` and `public/_redirects`
- [x] **Migrations baseline:** the former `supabase/schema.sql`
- [x] **Wedding date:** does not limit the plan

All decided; no phase is blocked.

## Phase 1: Formatting and verification (~1 h, low risk)

- [ ] Isolated commit with `npm run format`; record its hash in `.git-blame-ignore-revs` afterwards (optional)
- [x] Add scripts: `typecheck` (`tsc -b`), `lint` (`oxlint -f unix`, 931 bytes instead of 2,917), `check` (types + lint + formatting; tests join in phase 3)
- [x] Make `check` print only errors
- [x] GitHub Actions CI running `check` and `build`

**Done when:** `npm run check` passes and its output fits in a few lines.

## Phase 2: Context and sources of truth (~2 h, low risk)

- [x] Root `CLAUDE.md`, up to 60 lines: purpose, commands, folder map, conventions and pitfalls
- [x] Short `api/CLAUDE.md` and `supabase/CLAUDE.md` with local rules only
- [x] Extract what still applies from `instawedding_development_guide.md` and remove it
- [x] README: align the package manager, drop the mention of a missing `LICENSE`
- [x] Remove Netlify files
- [x] Unify SQL in `supabase/migrations/`

**Done when:** a new session answers "where do I add a field to Post?" without opening the pages.

## Phase 1.5: Security

- [x] Admin actions moved to authorized endpoints; roles resolved on the server
- [x] Guest posts and likes protected by owner policies
- [x] OTP: attempt limits, single-use codes, no code in responses on deployments
- [x] Uploads require a Google session and are rate limited
- [x] Migrations written and tested in an embedded Postgres
- [ ] Rollout: see `docs/SECURITY_ROLLOUT.md`

## Phase 3: Tests and agent configuration (~1 day, low risk)

Tests (Vitest; jsdom and Testing Library for components only):

- [x] `api/_lib/security.ts`: signature, expiration, tampered token, OTP
- [x] `src/utils`: `computeCrc32`, `buildZipArchive`, pure functions in `video.ts`, `session.ts`
- [x] `offline-queue.service.ts`: online, offline, resume, failure
- [x] Mock repositories: like, approve, delete
- [x] Smoke test for the 5 pages with mocks: renders and performs the main action
- [x] Add `test` to `check`, with the `dot` reporter

Claude Code (versioned `.claude/settings.json`):

- [x] Allow `npm run check/lint/test/typecheck/build`; deny reading `.env` and `.env.local`
- [x] Post-edit hook: run Prettier on the changed file, silently
- [x] Disable the Vercel plugin in this project; re-enable for deploys and logs
- [ ] `new-migration` and `new-endpoint` skills, only if the routine repeats

**Done when:** deliberately breaking a critical function makes `check` fail.

## Phase 4: Split the pages (2 to 4 days, medium risk)

One page per PR. For each: passing smoke test → extract pure functions → hooks → JSX sections → check on mobile and desktop.

Structure: `src/features/<name>/{<Name>Page.tsx, components/, hooks/}`. The page only composes; files of 150 to 300 lines. No re-export `index.ts`.

**4.1 Admin** (1,523 lines)

- [ ] hooks: `useAdminSession` (OTP and logout), `usePostModeration`, `useAlbumExport` (ZIP and CSV), `useChallenges`, `useCeremonialists`
- [ ] components: `AdminLogin`, `AdminTopBar`, `MetricsCards`, `AlbumToolbar`, `ModerationGrid`, `ChallengeForm`, `ChallengeList`, `CeremonialistPanel`

**4.2 Feed** (1,469 lines)

- [ ] hooks: `useFeedPosts`, `useLikes`, `usePullToRefresh`, `usePostActions` (download, share, delete), `useInfiniteScroll`
- [ ] components: `PullIndicator`, `FeedToolbar`, `FilterTabs`, `UploadProgressCards`, `NewPostsPill`, `PostCard`, `PostGrid`, `FeedSidebar`, `DeletePostModal`
- [ ] move `formatRelativeTime` to `utils/`

**4.3 Projector** (964 lines, used live: test in full screen)

- [ ] hooks: `useSlideshow`, `useProjectorFeed`, `useFullscreen`, `useAutoHideControls`
- [ ] components: `ProjectorHeader`, `OperatorControls`, `MainStage`, `Filmstrip`, `Podium`, `NewPostBanner`, `QrModal`

**4.4 Capture** (993 lines, critical: test photo, video and offline on a real device)

- [ ] hooks: `useMediaSelection`, `usePostSubmit`
- [ ] components: `GuestProfileBar`, `MediaPreview`, `StudioControls`, `PostDetailsForm`

**4.5 Shared**

- [ ] `topContributors` and `totalLikesCount` exist in Feed and Projector: compare and unify in `utils/post-stats.ts`
- [ ] Guest login is repeated in Feed and Capture: consider `useGuestAuth`
- [ ] Revisit the 6 oxlint warnings

**Done when:** baseline targets are met and no smoke test was changed just to pass.

## Phase 5: Measure and maintain (~1 h)

- [ ] Remeasure the baseline
- [ ] Run 3 fixed tasks in clean sessions, on `be2341b` and now, comparing with `/context` and `/cost`:
  1. "Add a 'videos' filter to the feed" (discard the diff)
  2. "Explain the offline upload flow"
  3. "Add a column to the admin CSV" (discard the diff)
- [ ] File size limit as a lint warning (`max-lines`, 300)
- [ ] Update `CLAUDE.md` only when the agent fails for lack of context

## Out-of-scope findings

Security: the list is kept outside the repository.

Consistency:

- [ ] `AdminPage.tsx:49` uses `VITE_USE_MOCKS === 'true'` while the factories use `!== 'false'`: they diverge when the variable is empty

Upload queue (`offline-queue.service.ts`), found while writing tests:

- [x] A failed upload is saved without `showOnProjector`, so after a reload it falls back to `true` even if the guest opted out
- [x] Cancelling a task mid-upload does not abort it: the post is still created
- [x] `SupabasePostRepository.deletePost` ignores the returned `error`, so a failed deletion looks successful (same in `togglePostApproval` and `clearAllPosts`)
