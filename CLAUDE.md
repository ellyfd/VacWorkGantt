# CLAUDE.md

Guidance for AI assistants working in this repository.

## Project overview

VacWorkGantt is an internal management system that combines employee leave (排休)
and project Gantt scheduling. The frontend is a React + Vite SPA backed by the
[Base44](https://base44.com) low-code platform, which provides authentication
and entity persistence via `@base44/sdk`. The UI is in Traditional Chinese; keep
copy in 繁體中文 unless told otherwise.

## Tech stack

- **Build**: Vite 6, React 18, JavaScript (JSX). TS only in `src/utils/index.ts`; the rest is JS with `checkJs` enabled in `jsconfig.json`.
- **Routing**: `react-router-dom` 6, with all routes auto-registered in `src/pages.config.js`.
- **Data**: `@tanstack/react-query` (singleton client in `src/lib/query-client.js`, `refetchOnWindowFocus: false`, `retry: 1`).
- **Backend SDK**: `@base44/sdk` via `src/api/base44Client.js`. App ID, server URL, and access token come from URL params or `VITE_BASE44_*` env vars (see `src/lib/app-params.js`).
- **UI**: Tailwind CSS + shadcn/ui (style "new-york", base color "neutral") + Radix UI primitives. Components live in `src/components/ui/` — do **not** edit those manually unless updating shadcn output.
- **Forms**: `react-hook-form` + `zod`.
- **Dates**: `date-fns` (preferred) and `moment` (legacy). New code should use `date-fns` with `zhTW` locale.
- **Other**: `framer-motion`, `recharts`, `three`, `@hello-pangea/dnd`, `jspdf`, `html2canvas`, `react-leaflet`, `lodash`.

## Common commands

```bash
npm install          # install deps (Node 18+)
npm run dev          # start Vite dev server
npm run build        # production build → dist/
npm run preview      # preview build
npm run lint         # ESLint (quiet mode, errors only)
npm run lint:fix     # ESLint with autofix
npm run typecheck    # tsc against jsconfig.json (checkJs)
```

There is no test runner configured. Verify changes with `lint`, `typecheck`,
and manual browser testing via `npm run dev`. `<React.StrictMode>` is **on**
in `main.jsx`, so dev mode double-invokes effects/render — keep effect cleanup
correct or you'll see warnings.

## Repository layout

```
src/
├── api/                 # Base44 SDK wrappers — DO NOT add business logic here
│   ├── base44Client.js  # createClient() singleton
│   ├── entities.js      # Re-exports of base44.entities (mostly unused; pages use base44.entities.* directly)
│   └── integrations.js  # InvokeLLM, SendEmail, UploadFile, etc. (also mostly unused; callers reach into base44.integrations.Core)
├── assets/              # static assets
├── components/
│   ├── calendar/        # leave calendar table & cells (CalendarHeader, LeaveCalendarTable, LeaveCell, WeekCalendarTable)
│   ├── dashboard/       # dashboard widgets (LeaveStatistics)
│   ├── gantt/           # Gantt chart pieces (GanttRow, dialogs, MobileGanttChart, FilterBar, TimeNavigation, ImportScheduleDialog, TimeDialogs)
│   ├── hooks/           # feature-level hooks
│   ├── ui/              # shadcn/ui primitives (generated; avoid manual edits)
│   ├── utils/           # shared business helpers
│   ├── ConfirmDialog.jsx        # use with useConfirmDialog instead of window.confirm
│   └── UserNotRegisteredError.jsx  # error screen for authError.type === 'user_not_registered'
├── hooks/               # global hooks (useIsMobile)
├── lib/
│   ├── AuthContext.jsx          # AuthProvider + useAuth
│   ├── NavigationTracker.jsx    # postMessage to parent + base44.appLogs
│   ├── PageNotFound.jsx
│   ├── VisualEditAgent.jsx      # iframe visual-edit overlay (Base44 editor integration)
│   ├── app-params.js            # appId/serverUrl/token resolution
│   ├── ganttUtils.js            # color helpers, normalizeDate, calculateWorkingDays
│   ├── leaveUtils.js            # getLeavePeriod (AM/PM/full), holiday/leave Map builders
│   ├── query-client.js
│   └── utils.js                 # cn() classname helper, isIframe
├── pages/               # one component per route (auto-registered)
├── utils/index.ts       # createPageUrl()
├── App.jsx              # AuthProvider → QueryClient → Router → Routes
├── Layout.jsx           # sidebar + mobile bottom-tab shell, profile sheet
├── main.jsx             # ReactDOM.createRoot + <React.StrictMode>
├── pages.config.js      # AUTO-GENERATED — only `mainPage` is hand-editable
└── index.css            # Tailwind layers + shadcn HSL theme variables
```

Path alias `@/*` → `./src/*` (configured in `jsconfig.json`, `vite.config.js`,
and `components.json`). Always import via `@/...`, never relative paths
that climb out of `src/`.

### Hooks under `src/components/hooks/`

- `useArchivedProjects` — Gantt season archive state, persisted in `localStorage` (`gantt-archived-projects`).
- `useCellClickHandler` — single/double click discrimination on calendar cells.
- `useConfirmDialog` — `[dialogProps, confirm]` API; `confirm(msg, opts)` returns `Promise<boolean>`.
- `useDialogState` — central state for the many GanttChart dialogs.
- `useDragState` — `isDragging / dragTaskId / dragStart / dragEnd`.
- `useFilterState` — Gantt filter state, persisted in `localStorage` (`gantt-filters`).
- `useFormData` — Gantt project / task form state.
- `useOptimisticTaskUpdate` — wraps `GanttTask.update` with optimistic cache write + rollback on error.
- `useProjectCreation` — temp state for the "new season" flow (creating project id, schedule file, etc.).

### Shared business helpers under `src/components/utils/`

- `leaveWarnings.jsx` — `checkDeputyConflict`, `checkDeptLimit`, `buildWarningInfo`. Internally builds Map+Set lookups so calling them in a loop (e.g., 30-day range mutation) is linear, not quadratic. **Use these instead of inlining the deputy / dept-1/3 logic.**
- `leaveNotifications.jsx` — `sendLeaveNotification({ action: 'create' | 'delete', ... })` and `sendRangeDeleteNotification`. Both fan out to admins + the requester's deputies. **Use these for all leave-record mutations** so notification type (`leave_created` / `leave_deleted`) and message format stay consistent.
- `leaveRangeDelete.jsx` — `buildDeleteRange` for double-click-to-delete-consecutive-leave UX.

## Routing conventions

- Pages are **auto-registered**: any new file under `src/pages/` is added to
  `pages.config.js` automatically. The header comment in that file warns that
  it is generated; only `mainPage` is hand-editable. Currently `mainPage:
  "LeaveCalendar"`.
- Route URLs are derived from page filenames via `createPageUrl(name)` in
  `src/utils/index.ts` (replaces spaces with hyphens, prefixes `/`). Always
  use `createPageUrl('PageName')` instead of hardcoded paths so route changes
  stay in sync.
- All routes are wrapped by `Layout.jsx` (top-level sidebar + mobile bottom
  tab bar). A `*` catch-all renders `PageNotFound`.
- There is no `<ProtectedRoute>` component; auth gating happens once in
  `App.jsx` based on `useAuth()`.

## Auth model

- `AuthProvider` (`src/lib/AuthContext.jsx`) loads app public settings, then
  calls `base44.auth.me()` if a token is present. It exposes `user`,
  `isAuthenticated`, `isLoadingAuth`, `isLoadingPublicSettings`, `authError`,
  `appPublicSettings`, `logout`, `navigateToLogin`.
- Tokens flow in via `?access_token=...` URL param, persisted to
  `localStorage` as `base44_access_token`. App ID/server URL likewise come
  from query params or `VITE_BASE44_APP_ID` / `VITE_BASE44_BACKEND_URL` /
  `VITE_BASE44_FUNCTIONS_VERSION`.
- Employees bind to a Base44 user via `Employee.user_emails` (an array). The
  `Layout` shows a forced binding dialog for non-admin users without a bound
  Employee record. When checking "is current user X", match
  `currentUser.email` against `employee.user_emails`.
- `currentUser.role === 'admin'` gates admin features. Don't gate on hardcoded
  emails.
- `authError.type === 'user_not_registered'` renders `UserNotRegisteredError`
  (a real card with "切換帳號" action that calls `logout()`).

## Base44 entity usage

Entities used across the app (uppercase calls to `base44.entities.X`):

- `Employee`, `Department`, `Group` (人員/部門/群組)
- `LeaveType`, `LeaveRecord`, `Holiday` (休假/假別/國定假日)
- `GanttProject`, `GanttTask`, `Project`, `Sample` (專案/任務/樣品)
- `Notification` (站內通知; types are `'leave_created'` and `'leave_deleted'`)

Common patterns:

```js
// List with sort field
base44.entities.Department.list('sort_order')

// Filter + sort + limit
base44.entities.Notification.filter(
  { recipient_email: currentUser.email },
  '-created_date',
  50,
)

// Range query operators (Mongo-style)
base44.entities.LeaveRecord.filter({
  employee_id: empId,
  date: { $gte: '2026-01-01', $lte: '2026-12-31' },
})

// Bulk create (used by AllLeaveCalendar.rangeLeaveMutation)
base44.entities.LeaveRecord.bulkCreate([...])

// Mutations
base44.entities.Employee.update(id, { user_emails: [...] })
```

Auth helpers: `base44.auth.me()`, `base44.auth.logout(returnUrl?)`,
`base44.auth.redirectToLogin(returnUrl)`.

Integrations live on `base44.integrations.Core` (`InvokeLLM`, `SendEmail`,
`SendSMS`, `UploadFile`, `GenerateImage`, `ExtractDataFromUploadedFile`).
`src/api/integrations.js` re-exports them but is largely unused — most
callers go through `base44.integrations.Core.X` directly.

## React Query conventions

- Use the shared `queryClientInstance`; do not create new clients.
- Query keys are typically `[name]` or `[name, ...deps]`. Examples in use:
  `['currentUser']`, `['employees']`, `['departments']`, `['leaveTypes']`,
  `['boundEmployee', email]`, `['notifications', email]`,
  `['todayLeaves', date]`, `['myLeaveRecords', empId, year]`,
  `['leaveRecords', year, month, empId?]`, `['ganttProjects']`,
  `['ganttTasks']`, `['holidays']`. Reuse these exact keys when reading the
  same data so caches hit; invalidate by base name after mutations
  (e.g., `queryClient.invalidateQueries(['boundEmployee'])`).
- Gate dependent queries with `enabled: !!dep`.
- Notifications poll via `refetchInterval: 60000` + `staleTime: 30000` in
  `Layout.jsx`. If you change either, factor in the per-tab × per-user
  request cost.
- For optimistic updates on Gantt mutations, see
  `src/components/hooks/useOptimisticTaskUpdate.jsx`. For optimistic temp
  rows, use `crypto.randomUUID()` (Date.now()-based ids collide on rapid
  clicks).

## UI conventions

- **shadcn/ui**: import primitives from `@/components/ui/*`. Style is
  "new-york", icon library is `lucide-react`. Keep `tsx: false` (this project
  is JSX, not TSX).
- **Radix Select**: `<SelectItem value="">` and `<SelectItem value={null}>`
  are forbidden. Use a sentinel string (e.g. `"__none__"`) and normalize on
  change. See the deputy pickers in `Layout.jsx` for the pattern.
- **Tailwind**: prefer the semantic tokens defined in `src/index.css`
  (`bg-background`, `text-foreground`, `border-border`, `bg-card`,
  `text-muted-foreground`, `success`, `warning`, `info`, etc.) over raw
  greys/blues when adding new surfaces. Existing pages use a lot of
  `bg-gray-*` / `text-gray-*`; match the surrounding file's style rather than
  refactoring opportunistically.
- **Class merging**: use `cn(...)` from `@/lib/utils` for conditional classes.
- **Mobile**: `useIsMobile()` (`src/hooks/use-mobile.jsx`) at the 768px
  breakpoint. `Layout.jsx` already provides a desktop sidebar (`md:flex`) and
  mobile bottom-tab bar (`md:hidden`); pages should be responsive within
  that frame. The Gantt page renders `MobileGanttChart` for mobile and the
  desktop `GanttChart` inside `hidden md:block` (see
  `src/pages/GanttManagement.jsx`).
- **Confirm dialogs**: do not use `window.confirm`. Use
  `useConfirmDialog()` (`src/components/hooks/useConfirmDialog.jsx`) with the
  reusable `ConfirmDialog` component — it returns a Promise<boolean>.
- **Toasts**: `useToast()` from `@/components/ui/use-toast` and the `<Toaster />`
  already mounted in `App.jsx`. `sonner` and `react-hot-toast` are installed
  but the canonical toaster is shadcn's `useToast`.
- **Iframe context**: the app may run inside the Base44 editor iframe. `isIframe`
  in `lib/utils.js` and `VisualEditAgent` handle this; the app posts navigation
  events to `window.parent` via `NavigationTracker`. Avoid breaking these
  postMessage hooks.

## Domain rules to keep in mind

- **Leave periods** (`getLeavePeriod` in `lib/leaveUtils.js`): leave types
  named `健檢` or `上午休` → AM, `下午休` → PM, anything else → full day.
  This is hard-coded against the leave-type **name** — renaming a leave
  type in `LeaveSettings` will silently break period detection. See the
  long-tail items below.
- **Working days**: `calculateWorkingDays(start, end)` (`lib/ganttUtils.js`)
  excludes Sat/Sun; it does **not** account for `Holiday` records — pull those
  separately when needed.
- **Color contrast**: use `getContrastColor` / `getLightColor` /
  `getSoftBarColor` / `getDarkTextColor` from `lib/ganttUtils.js` for
  project/leave color theming so accessibility stays consistent.
- **Notifications**: when creating/deleting a `LeaveRecord`, send via
  `sendLeaveNotification` / `sendRangeDeleteNotification`
  (`components/utils/leaveNotifications.jsx`). Both fan out to admins
  and the requester's deputies. The helper sets the right `type` based on
  the action (`leave_created` / `leave_deleted`); don't reinvent inline.
- **Warning detection** (deputy conflict / dept 1/3 cap): use
  `checkDeputyConflict`, `checkDeptLimit`, `buildWarningInfo`
  (`components/utils/leaveWarnings.jsx`). They build maps internally so
  calling them in a 30-day loop stays linear.
- **Season archive state** is persisted in localStorage (see
  `useArchivedProjects`) — preserve that behavior when touching Gantt season UI.
- **Batch writes**: when fanning out N updates / deletes (e.g., admin tools
  in `Dashboard.handleCleanDuplicates / handleScanWarnings`), pipe through
  `runInBatches(items, fn, 10)` instead of `Promise.all(...)`. The backend
  doesn't enjoy 500 simultaneous PATCHes.

## Lint & type-check scope

- ESLint applies to `src/components/**`, `src/pages/**`, and `src/Layout.jsx`.
  It ignores `src/lib/**` and `src/components/ui/**`. Rules of note:
  unused imports/vars are errors/warnings (`unused-imports/*`); `no-unused-vars`
  itself is off; `react/prop-types` is off; React-in-scope is not required.
- TS `checkJs` runs over `src/components/**/*.js`, `src/pages/**/*.jsx`, and
  `src/Layout.jsx`. `src/api`, `src/lib`, `src/components/ui`, `node_modules`,
  and `dist` are excluded.
- When adding files outside the linted scope, don't invent new ESLint configs;
  follow the existing scoping.

## Coding conventions

- Comments and UI strings are in 繁體中文; identifiers are English. Keep that
  split.
- Default export per page/component (matches existing files).
- New shared business logic → `src/lib/` (skipped by lint, used everywhere).
- New UI helpers tied to a feature folder → `src/components/<feature>/` or
  `src/components/utils/`.
- Avoid duplicating queries — if `Layout.jsx` already fetches `employees`,
  `departments`, `leaveTypes`, etc. with a known key, reuse the same key.
- For lookup-heavy render paths, build `Map` once via `useMemo` instead of
  `array.find` per item. See `Dashboard.jsx`'s `employeeMap / departmentMap /
  leaveTypeMap` for the pattern.
- Don't edit `src/pages.config.js` by hand except for `mainPage`. New pages
  are picked up automatically.

## Git workflow

- Default branch: `main`. Feature branches use `claude/<topic>-<slug>` naming
  (per recent history). Merges land via PRs (`Merge pull request #N from ...`)
  with conventional-commit-style subjects: `feat:`, `fix:`, `docs:`, `style:`,
  `chore:`, `refactor:`, `perf:`. Match this style for new commits.
- This session's working branch is `claude/add-claude-documentation-0BIub`
  (per task instructions). Push to that branch only.

## Things to be careful about

- `src/pages.config.js` is auto-generated — touching imports there will be
  overwritten next time the generator runs.
- `@hello-pangea/dnd` sets a `transform` on `<tr>` elements that breaks
  `position: sticky` on child `<td>`. `index.css` includes a `!important`
  override for non-dragging rows; don't remove it.
- `crypto.randomUUID()` requires a secure context (HTTPS or localhost).
  Production HTTPS and Vite's `http://localhost` dev server both qualify;
  custom-IP HTTP environments would need a polyfill.
- The dev server suppresses Vite warnings (`logLevel: 'error'`); enable
  `--logLevel info` locally if you suspect a missing dep.
- No `.env` is committed; the app falls back to URL params for `app_id` /
  `server_url` / `access_token`. For local dev, copy a working URL from the
  Base44 editor or set `VITE_BASE44_APP_ID` and `VITE_BASE44_BACKEND_URL`.
- `<React.StrictMode>` is on, so dev double-invokes effects. Effects without
  proper cleanup will warn or fire twice — fix the underlying effect rather
  than disabling StrictMode.

## Known long-tail items (worth fixing eventually)

These aren't bugs in the "system explodes" sense, but they're traps for
future work — flag them when you touch nearby code:

- **`getLeavePeriod` is name-keyed**: renaming `健檢` / `上午休` / `下午休`
  in `LeaveSettings` silently breaks AM/PM detection. The proper fix is a
  `period` field on `LeaveType` plus a one-shot migration; would need
  backend coordination.
- **`GanttChart.jsx` is 1800+ lines**: state, effects, rendering, dialogs
  all in one file. Splitting into `GanttHeader / GanttLeftPanel / GanttBody
  / GanttDialogs` (each `React.memo`) is the biggest perf lever still on
  the table.
- **`GanttRow` lacks `React.memo`**: drag-induced re-renders propagate to
  every row. Memoizing with stable cell-prop maps would localize updates.
- **Range mutation uses helpers but rebuilds maps per call**: each
  `checkDeputyConflict / checkDeptLimit / buildWarningInfo` call rebuilds
  the leaveType / employee Map internally. For very large ranges, accepting
  prebuilt maps as optional params would shave another constant factor.
