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
and manual browser testing via `npm run dev`.

## Repository layout

```
src/
├── api/                 # Base44 SDK wrappers — DO NOT add business logic here
│   ├── base44Client.js  # createClient() singleton
│   ├── entities.js      # Re-exports of base44.entities (largely unused; pages use base44.entities.* directly)
│   └── integrations.js  # InvokeLLM, SendEmail, UploadFile, etc.
├── assets/              # static assets
├── components/
│   ├── calendar/        # leave calendar table & cells
│   ├── dashboard/       # dashboard widgets
│   ├── gantt/           # Gantt chart pieces (rows, dialogs, mobile view, filter/time nav)
│   ├── hooks/           # feature-level hooks (useDialogState, useFilterState, useArchivedProjects, ...)
│   ├── ui/              # shadcn/ui primitives (generated; avoid manual edits)
│   ├── utils/           # shared business helpers (leaveNotifications, leaveWarnings, leaveRangeDelete)
│   ├── ConfirmDialog.jsx        # use with useConfirmDialog instead of window.confirm
│   ├── ProtectedRoute.jsx
│   └── UserNotRegisteredError.jsx
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
├── main.jsx
├── pages.config.js      # AUTO-GENERATED — only `mainPage` is hand-editable
└── index.css            # Tailwind layers + shadcn HSL theme variables
```

Path alias `@/*` → `./src/*` (configured in `jsconfig.json`, `vite.config.js`,
and `components.json`). Always import via `@/...`, never relative paths
that climb out of `src/`.

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

## Base44 entity usage

Entities used across the app (see uppercase calls to `base44.entities.X`):

- `Employee`, `Department`, `Group` (人員/部門/群組)
- `LeaveType`, `LeaveRecord`, `Holiday` (休假/假別/國定假日)
- `GanttProject`, `GanttTask`, `Project`, `Sample` (專案/任務/樣品)
- `Notification` (站內通知)
- `Query` (re-exported via `src/api/entities.js`)

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

// Mutations
base44.entities.Employee.update(id, { user_emails: [...] })
```

Auth helpers: `base44.auth.me()`, `base44.auth.logout(returnUrl?)`,
`base44.auth.redirectToLogin(returnUrl)`.

Integrations (`src/api/integrations.js`): `InvokeLLM`, `SendEmail`, `SendSMS`,
`UploadFile`, `GenerateImage`, `ExtractDataFromUploadedFile`. Use the named
re-exports rather than reaching into `base44.integrations.Core` directly when
adding new call sites.

## React Query conventions

- Use the shared `queryClientInstance`; do not create new clients.
- Query keys are typically `[name]` or `[name, ...deps]`. Examples in use:
  `['currentUser']`, `['employees']`, `['departments']`, `['leaveTypes']`,
  `['boundEmployee', email]`, `['notifications', email]`,
  `['todayLeaves', date]`, `['myLeaveRecords', empId, year]`. Reuse these
  exact keys when reading the same data so caches hit; invalidate by base name
  after mutations (e.g., `queryClient.invalidateQueries(['boundEmployee'])`).
- Gate dependent queries with `enabled: !!dep`.
- Notifications poll via `refetchInterval: 30000` in `Layout.jsx`.
- For optimistic updates on Gantt mutations, see
  `src/components/hooks/useOptimisticTaskUpdate.jsx`.

## UI conventions

- **shadcn/ui**: import primitives from `@/components/ui/*`. Style is
  "new-york", icon library is `lucide-react`. Keep `tsx: false` (this project
  is JSX, not TSX).
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
  Half-day leaves count 0.5 and full days count 1 in summaries.
- **Working days**: `calculateWorkingDays(start, end)` (`lib/ganttUtils.js`)
  excludes Sat/Sun; it does **not** account for `Holiday` records — pull those
  separately when needed.
- **Color contrast**: use `getContrastColor` / `getLightColor` /
  `getSoftBarColor` / `getDarkTextColor` from `lib/ganttUtils.js` for
  project/leave color theming so accessibility stays consistent.
- **Notifications**: when creating/deleting a `LeaveRecord`, send a
  `Notification` via `sendLeaveNotification` (`components/utils/leaveNotifications.jsx`)
  — it fans out to admins and the requester's deputies.
- **Season archive state** is persisted in localStorage (see
  `useArchivedProjects` and recent commits) — preserve that behavior when
  touching Gantt season UI.

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
- Don't edit `src/pages.config.js` by hand except for `mainPage`. New pages
  are picked up automatically.

## Git workflow

- Default branch: `main`. Feature branches use `claude/<topic>-<slug>` naming
  (per recent history). Merges land via PRs (`Merge pull request #N from ...`)
  with conventional-commit-style subjects: `feat:`, `fix:`, `docs:`, `style:`,
  `chore:`. Match this style for new commits.
- This session's working branch is `claude/add-claude-documentation-0BIub`
  (per task instructions). Push to that branch only.

## Things to be careful about

- `src/pages.config.js` is auto-generated — touching imports there will be
  overwritten.
- `@hello-pangea/dnd` sets a `transform` on `<tr>` elements that breaks
  `position: sticky` on child `<td>`. `index.css` includes a `!important`
  override for non-dragging rows; don't remove it.
- `src/components/UserNotRegisteredError.jsx` is currently a no-op placeholder
  (returns `null`) but is still referenced from `App.jsx` and
  `ProtectedRoute.jsx` — leave the file/exports in place even if rewriting.
- The dev server suppresses Vite warnings (`logLevel: 'error'`); enable
  `--logLevel info` locally if you suspect a missing dep.
- No `.env` is committed; the app falls back to URL params for `app_id` /
  `server_url` / `access_token`. For local dev, copy a working URL from the
  Base44 editor or set `VITE_BASE44_APP_ID` and `VITE_BASE44_BACKEND_URL`.
