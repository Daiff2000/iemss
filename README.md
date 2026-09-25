# IEMS — Vercel Edition

Single Vercel deployment:

- React + Vite frontend (`frontend/`)
- Express 5 API running as a Vercel Node Function (`api/index.js` -> `backend/server.js`)
- PostgreSQL via `pg`, JWT + bcrypt auth

## Required Vercel environment variables

```text
DATABASE_URL=your PostgreSQL connection string
JWT_SECRET=a-long-random-secret
NODE_ENV=production
```

Both are checked at runtime and produce a clear JSON error if missing.
`GET /api/health` reports whether each one is set and works even when they
aren't — use it first when diagnosing a deployment.

## How the schema is created

The API creates its own schema on the first request after a cold start:
`backend/database/init.js` runs `backend/database/bootstrap.sql` under a
Postgres advisory lock, so concurrent serverless invocations can't race. There
is no database step in the build.

> The `database/` folder at the repo root (`setup-postgres.js`, `schema.sql`,
> `initial-data.json`, `init.js`) is **not referenced by any code** — nothing
> imports it and the build never runs it. It is left in place only as a
> seed-data archive. An earlier README claimed the build ran
> `setup-postgres.js`; it did not. Delete the folder or wire it up
> deliberately, but don't rely on it.

## Routing

The app's routes are literal `.html` filenames (`/home.html`, `/reports.html`, ...)
because the legacy page scripts hardcode them in redirects and in the active-nav
check. `vercel.json` rewrites each one to `/index.html` so React Router can
handle it, and rewrites `/api/*` to the function. `frontend/vite.config.js`
reproduces the same rewrites for `npm run dev`.

## Local development

```bash
npm install                 # API dependencies (root package.json)
npm --prefix frontend ci

node backend/server.js      # API on :3000
npm run dev                 # frontend on :5173, proxies /api to :3000
```

Set `VITE_API_TARGET` to point the dev proxy somewhere other than
`http://localhost:3000`.

## Roles

One permission table is applied in three places and they must stay in sync:
`app-shell.js` (nav visibility), the guard at the top of each page script, and
the role middleware in `backend/middleware/auth.js`.

| Page | Allowed roles |
| --- | --- |
| Home | all signed-in users |
| Employees, Import, Reports | `supervisor`, `admin`, `system_creator` |
| Manual entry | `admin`, `system_creator` |
| Audit logs, Themes | `system_creator` |

## Styling

All colour tokens live in `frontend/src/legacy-style.css`. Per-page stylesheets
in `frontend/src/legacy-page-styles/` are injected *after* the global sheet, so
redefining `:root` there silently overrides the palette on that page only —
don't. Page scripts that inject a `<style>` into `<head>` must tag it
`data-iems-page-style` so `useLegacyScripts` can remove it on navigation.

Do not commit `.env` files or a real `JWT_SECRET`.
