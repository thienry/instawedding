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

### Remeasured (2026-11-24, after PR #9, before splitting `AppLayout.tsx` and `offline-queue.service.ts`)

| Metric                 | Now                                                   | Target met |
| ---------------------- | ----------------------------------------------------- | ---------- |
| Versioned text         | 817 KB (637 KB on `be2341b`, remeasured the same way) | track only |
| Largest file in `src/` | 17.9 KB (`AppLayout.tsx`)                             | no         |
| Largest page           | 6.9 KB (`CapturePage.tsx`)                            | yes        |
| Files failing Prettier | 0                                                     | yes        |
| oxlint warnings        | 0 `set-state-in-effect`, 1 justified                  | yes        |
| Tests                  | 199 in 20 files                                       | yes        |
| `CLAUDE.md`            | 58 lines                                              | yes        |

Above 15 KB: `AppLayout.tsx` and `offline-queue.service.ts` (16.2 KB).

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
- [x] Rollout done on 2026-11-24 (`docs/SECURITY_ROLLOUT.md`)

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

- [x] hooks: `useAdminData` (joint load), `useAdminSession`, `useOtpLogin`, `usePostModeration`, `useAlbumExport` (ZIP and CSV), `useChallenges`, `useCeremonialists`
- [x] components: `AdminLogin` (`OtpEmailForm`, `OtpCodeForm`, `MockLoginShortcuts`), `AdminTopBar`, `AdminTabs`, `MetricsCards`, `AlbumToolbar`, `ModerationGrid`, `ModerationCard`, `ChallengeForm`, `ChallengeList`, `ChallengeCard`, `CeremonialistForm`, `CeremonialistList`
- [ ] check on mobile and desktop (author)

**4.2 Feed** (1,469 lines)

- [x] hooks: `useFeedGuest`, `useFeedPosts`, `usePendingUploads`, `useFeedFilter`, `useLightbox`, `useLikes`, `usePullToRefresh`, `usePostSharing`, `usePostDeletion`, `useInfiniteScroll`
- [x] components: `PullIndicator`, `FeedToolbar`, `FilterTabs`, `ChallengeFilterPill`, `UploadCard`, `NewPostsPill`, `PostGrid`, `PostCard` (`PostHeader`, `PostMedia`, `PostFooter`), `FeedSkeleton`, `EmptyFeed`, `FeedFooter`, `FeedSidebar`, `TopContributors`, `DeletePostModal`, `ShareToast`
- [x] move `formatRelativeTime` to `utils/`
- [ ] check on mobile and desktop (author)

**4.3 Projector** (964 lines, used live: test in full screen)

Redesigned at the author's request, so the layout differs from the original page.

- [x] hooks: `useSlideshow`, `useReadySlide`, `useCrossfade`, `useProjectorFeed`, `useFullscreen`, `useAutoHideControls`, `useProjectorShortcuts`; `useAdminSession` moved to `src/hooks/`
- [x] components: `ProjectorLoading`, `ProjectorLocked`, `ProjectorShow`, `ProjectorHeader`, `OperatorControls`, `Backdrop`, `GoldDust`, `MainStage` (`StageSlide`), `Spotlight`, `Filmstrip`, `Podium`, `NewPostBanner`, `QrInvite`, `QrModal`, `EmptyStage`
- [ ] check in full screen on the party computer (author)

**4.4 Capture** (993 lines, critical: test photo, video and offline on a real device)

- [x] hooks: `useMediaSelection`, `usePostDraft`, `usePostSubmit`
- [x] components: `CaptureHeader`, `SignInGate`, `GuestProfileBar`, `CaptureChoices`, `ChallengeHint`, `MediaPreview` (`FrameOverlay`), `VideoSummary`, `StudioControls` (`FilterCarousel`, `FrameCarousel`), `PostDetailsForm` (`AuthorSummary`, `ChallengeSelect`, `ProjectorToggle`)
- [x] check photo, video and offline on a real device (author)

**4.5 Shared**

- [x] `topContributors` and `totalLikesCount`: Feed and Projector use `utils/post-stats.ts`
- [x] Guest login repeated in Feed and Capture moved to `src/hooks/useGuestAuth.ts`
- [x] Revisit the remaining oxlint warnings (0 left, 1 justified in `VideoRecorderModal`)
- [x] Challenges (370 lines), not in the original plan: `useChallengeBoard`, `utils/challenge-progress.ts`, `ChallengesBanner`, `PhotographerRanking` (uses `utils/post-stats.ts`), `ChallengeCard`, `ChallengesSkeleton`

**Done when:** baseline targets are met and no smoke test was changed just to pass.

## Phase 5: Measure and maintain (~1 h)

- [x] Remeasure the baseline
- [ ] Run 3 fixed tasks in clean sessions, on `be2341b` and now, comparing with `/context` and `/cost`:
  1. "Add a 'videos' filter to the feed" (discard the diff)
  2. "Explain the offline upload flow"
  3. "Add a column to the admin CSV" (discard the diff)
- [x] File size limit as a lint warning (`max-lines`, 300); `check` tolerates the 4 files already over it
- [x] Split `AppLayout.tsx` into `Sidebar` (`SidebarNav`, `SidebarAccount`, `SidebarAdminCard`, `SidebarAdminIcons`), `MobileHeader`, `OfflineBanner`, `usePageTitle` and `useSidebarCollapsed`
- [x] Split `offline-queue.service.ts`: `upload-task.ts`, `upload-store.ts` and `legacy-queue.ts` in `src/services/offline-queue/`; the unused `enqueue` was removed
- [ ] Split those 4: `VideoRecorderModal.tsx`, `QrCodeSvg.tsx`, `feed-notification.service.ts`, `photo-filters.ts`
- [ ] Update `CLAUDE.md` only when the agent fails for lack of context

## Out-of-scope findings

Security: the list is kept outside the repository.

Consistency:

- [x] `AdminPage.tsx` used `VITE_USE_MOCKS === 'true'` while the factories used `!== 'false'`: they diverged when the variable is empty

Upload queue (`offline-queue.service.ts`), found while writing tests:

- [x] A failed upload is saved without `showOnProjector`, so after a reload it falls back to `true` even if the guest opted out
- [x] Cancelling a task mid-upload does not abort it: the post is still created
- [x] `SupabasePostRepository.deletePost` ignores the returned `error`, so a failed deletion looks successful (same in `togglePostApproval` and `clearAllPosts`)

Feed, found while splitting:

- [x] A failed like restores the heart but not the count
- [x] The notice of new posts says "novas fotos postada"
- [x] The download name drops accents instead of converting them (the admin ZIP converts)

Capture, found while splitting:

- [x] Choosing another photo while the first is still being compressed can post the first one (the late result overwrites the new file)
- [x] The caption of a guestbook card stays when the media is changed
- [x] Signing out with a photo selected leaves "Postar" in the header, doing nothing

Upload queue, found while splitting:

- [x] Opening the app on the feed does not resume the uploads left by the previous visit: `flush` runs while they are still being restored and finds none (reproduced)
- [x] When storing an upload aborts the transaction without a request error (as a full device may do), `submitInBackground` never resolves and the form stays on "Postando..." (reproduced by forcing the abort)
- [x] Retrying after a post creation whose answer was lost can publish it twice (not reproduced)

Boomerang recorder, found while reviewing its lint warning:

- [x] Leaving the page while recording still delivers the clip
- [x] Closing the modal before the camera is ready can leave the camera on

Challenges, found while splitting:

- [x] A failed load shows an empty page, with no message

Projector, fixed by the redesign:

- [x] The filmstrip ignored the filter, so clicking a thumbnail could open another post
- [x] The progress bar and the timer drifted apart after changing the photo by hand
- [x] A refresh that added or removed posts replaced the photo on display
- [x] With "Destaques" on, a new post was announced but the most liked one was shown
- [x] `animate-in` classes did nothing (the plugin is not installed), so there were no transitions
- [x] A rejected session check left the loading screen forever

Projector, found while splitting:

- [x] Videos of up to 10 s are cut by the 8 s slide
- [x] Hiding every post keeps the last ones on display (an empty refresh is ignored)
- [x] Space also clicks the focused button in some browsers, and Ctrl+F toggles full screen
- [x] `animate-in` classes also do nothing in the other screens that use them
