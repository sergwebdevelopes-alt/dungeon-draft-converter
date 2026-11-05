# CLAUDE.md

Web app that converts Dungeondraft `.dd2vtt` exports into VTT- and print-ready images (Express + React/Vite, sharp, Docker). See README.md for features, limits and settings.

## Rules

- **Every external library goes behind a port.** Define our own contract (interface or function type) and put the library in one adapter file that implements it. The rest of the code uses only the contract, so switching libraries means writing a new adapter, not changing callers. Examples: `src/zip/zip-writer.ts` (port) with `src/zip/fflate-zip-writer.ts` (the only file that imports fflate), and `src/http/upload/multipart-parser.ts` (port) with `src/http/upload/multer-multipart-parser.ts` (the only file that imports multer).
- **Every change is covered by tests.** New behaviour gets new tests; changed behaviour gets updated tests. Tests live next to the code as `*.test.ts` (for example `src/http/convert/request.test.ts`) and run with `npm test`. Check that a new test fails without the change it covers.

## Architecture

```
src/
├── server.ts      startup only: settings check, database, jobs, http server, listen, SIGTERM
├── app.ts         builds the Express app and wires dependencies (queue, routes)
├── config.ts      every process.env read and every limit
├── settings/      read-settings.ts: validated settings (Zod) for database, Patreon, gallery; stop-on-bad-settings.ts
├── http/          incoming requests (Express): routes, request parsing, errors, zip streaming
│   ├── upload/    upload rules, per-request temp folder, multipart port + multer adapter
│   └── client/    outgoing HTTP: HttpClient port (get, getBytes, timeout, abort) + fetch adapter (the only server file using fetch) + rate-limited client (a minimum time between requests)
├── jobs/          scheduled work: schedule() (timer, optional run at start, stop), upload cleanup, gallery sync (reads its settings from config.ts); startJobs({ galleryStores }) starts them all
├── queue/         PendingLimit (busy limit) and ConversionQueue (parallel slots, FIFO line, positions; cancel via AbortSignal)
├── zip/           zip port + fflate adapter
├── db/           Database port (query, transaction, exclusive lock) + pg adapter (the only file importing pg); openDatabase (connect + migrate); migrate.ts (the `db:migrate` script); migrations runner + migrations/*.sql; LOCKS (every advisory lock key)
├── gallery/       the gallery feature
│   ├── map-store.ts + postgres-map-store.ts   MapStore port + adapter (SQL through the Database port)
│   ├── image-store.ts + local-image-store.ts  ImageStore port + folder adapter (GALLERY_DIR, served at /maps by http/gallery-images.ts)
│   ├── sync.ts    one sync: Patreon posts → maps, images via map-images.ts, gallery saved in one transaction; runs through utils/single-flight.ts
│   ├── map-images.ts  makes sure a map's card/view/backdrop are stored: renders missing ones, keeps the previous version if that fails
│   ├── setup.ts   builds the stores and the sync from settings (used by server.ts and sync-now.ts, the `gallery:sync` script)
│   ├── model/     pure gallery rules: which posts count (public and in a collection), title, collection chips (collections.ts), slug, choosing the image, building a MapRecord (whose MapImage keeps only url, size and media ID), the public MapEntry (map-entry.ts), where images are stored (image-keys.ts), sync counts and folders (sync-plan.ts)
│   └── patreon/   Patreon ports + adapters: official API v2 (post list; refreshes the token on 401 through patreon-auth.ts) and the website's post details (collections, all images); TokenStore port + postgres-token-store.ts (the newest token pair; `seeded_from` = SHA-256 of the `.env` refresh token it started from, so a new `.env` pair wins); I/O and translation only
├── core/          image work: dd2vtt format, conversion, images, lighting, merge, gallery-images (card, view, backdrop)
└── utils/         small shared helpers (format.ts, time.ts, object.ts, error.ts, single-flight.ts: one run at a time, once more if asked meanwhile)
```

- `core/`, `queue/` and `gallery/` never import Express or multer.
- `settings/read-settings.ts` validates the database and gallery settings with a Zod schema behind `readSettings(env) → { settings, problems }` (the only file importing zod); `config.ts` calls it with `process.env`, and `server.ts` and `db/migrate.ts` stop with the list of problems if any (`settings/stop-on-bad-settings.ts`). Patreon settings are all or nothing.
- `process.env` is read only in `config.ts`. Settings and limits (sizes, timeouts, folders) live there; facts about formats and output (file extensions, zip folder names, image encoding constants) stay next to the code that produces them.
- URLs of outside services, page sizes, user agents, tags, IDs and other values someone might want to change also live in `config.ts`, never as constants inside an adapter. Request details that are part of an API's contract (field lists, query parameter names) stay in the adapter.
- Outgoing HTTP goes through `src/http/client/` (`HttpClient`, `HttpClientError`, `isAbortError`). Adapters receive the client as an argument, never `fetch` itself.
- Server features follow the front end's split. `<feature>/model/` holds pure TypeScript: data in, data out, no network, files, database or `config.ts` imports (settings are passed in). Adapters only fetch and translate into our types, with no business rules. Orchestration that joins adapters and model lives next to `model/` (e.g. `gallery/sync.ts`).
- Core errors extend `InvalidInputError` (→ 400) or `UnprocessableError` (→ 422) from `core/errors.ts`; `http/errors.ts` maps them by kind. HTTP-only errors use `HttpError`.
- Dependencies are passed in (for example `createApp` creates the `ConversionQueue` and hands it to the routes), not kept in module-level globals.

### Front end (`web/`)

```
web/src/
├── app/           entry, App, layout (header, footer, page shell)
├── shared/
│   ├── http/      HttpClient port + fetch adapter (only file using fetch); index.ts exports the `http` instance
│   ├── storage/   KeyValueStore port + localStorage adapter; index.ts exports `storage`
│   ├── lib/       small helpers and hooks: format, save-file, abortable, useObjectUrl, useFileDrop, useElapsed, useRotation
│   ├── theme/     light/dark choice (storage port) + toggle; web/public/theme.js applies a saved choice before React starts
│   ├── ui/        shared presentational components (Button/ButtonLink, Alert, Segmented, GridOverlay, …)
│   └── config/    site.ts (site name, nav, links, membership plans)
└── features/<feature>/
    ├── api.ts     the feature's contract over HttpClient, plus a ready instance
    ├── model/     pure TypeScript (no React, no fetch, no storage): types, rules, reducer
    ├── use*.ts    the hook joining model and api (effects only)
    ├── *.worker.ts  Web Worker entries for heavy work (converter: reading a .dd2vtt preview), each with an adapter that falls back to the page where workers are missing
    └── ui/        presentational components: data and callbacks through props
```

- Components never fetch or touch storage; logic goes in `model/` with its own tests.
- A feature reaches the network only through its `api.ts`, and storage only through `shared/storage`.
- No DI container: modules export ready instances (`http`, `storage`, `converterApi`); hooks take them as default parameters so tests can pass fakes.
- The ports rule covers runtime libraries (HTTP, storage, animation). UI frameworks and build tools (React, Tailwind, Vite, Vitest) are used directly.
- Membership plans live in `web/src/shared/config/site.ts` (`membership.plans`); adding a Patreon tier means adding one entry there. Pages use `Container` for width and padding; sections may run full width.
- The web app imports only types from the server's `src/`, plus `src/core/grid-stroke.ts` (the export grid style); ESLint enforces this.
- Use the shared `Button`/`ButtonLink`, `Alert` and `Segmented` instead of repeating their classes.
- Motion is imported only in `web/src/shared/ui/motion/`; features use its wrappers (`MotionProvider`, `Reveal`, `SharedFrame`, `Swipeable`).
- The gallery loads `GET /api/maps`, filled by the Patreon sync (public posts in any Patreon collection; collection names become filter chips). The web `MapEntry` is the server's type from `src/gallery/model/map-entry.ts`; `subtitle` and `squares` are optional, so the grid choice and the converter teaser appear only for maps with squares. The modal draws its grid with `GridOverlay`, so no gridded image is needed.
- Styling uses Tailwind with colour and font tokens in `web/src/styles.css`.

## Code style

- No comments in code unless asked.
- Small named functions; separate steps with blank lines (see `src/http/convert/handler.ts`).
- `async`/`await` with `try`/`catch` rather than `.then()` chains.
- User-facing sizes and durations go through `src/utils/format.ts`.

## Commands

- `npm run dev`: dev server with hot reload on port 3000. Env files are loaded by preloading dotenv in the npm scripts (`node --import dotenv/config`), never imported in code: `npm run dev` reads `.env`, `npm test` reads `.env.testing` (`DOTENV_CONFIG_PATH`); values set in the shell win. Don't use Node's `--env-file` flag with `--watch-path`: in Node 24 it makes the dev server restart in a loop.
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`
- Database tests run with plain `npm test` against the test Postgres from `npm run db` (`postgres-test` in `compose.dev.yml`: user/password/database `test`, `127.0.0.1:5433`, in-memory data). `.env.testing` (committed, no secrets) points at it; without that database they fail with "Start it with npm run db". They use `createTestDatabase()` from `src/db/testing.ts`, which creates an empty `test_<random>` database (per file, or per test where each test needs a fresh one) and drops it afterwards.
- `npm run build` also writes `.br`/`.gz` copies of text files in `web/dist` (`scripts/precompress.ts`); `src/http/precompressed.ts` serves them, and `src/http/cache-control.ts` decides caching per path.
- `npm run bench`: takes minutes; run it only when asked. `BENCH_TARGET=docker` measures the Docker image.
- Docker: `docker compose up -d --build` (use `HOST_PORT=3001` when the dev server is on 3000). It needs `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` (see `.env.example`; `POSTGRES_DB` defaults to the user). The database is configured by separate `POSTGRES_HOST/PORT/USER/PASSWORD/DB` settings, never a URL; compose sets `POSTGRES_HOST=postgres` for the app. The `app` container is named `dd-converter`; for test runs use a separate project (`-p`) with an override that renames containers and the image, so the user's container is never replaced.
- `npm run db`: starts the dev Postgres (`127.0.0.1:5432`, for `npm run dev`; `POSTGRES_DEV_BIND=0.0.0.0` in `.env` publishes it on the local network) and the test Postgres (`127.0.0.1:5433`, for `npm test`) from `compose.dev.yml`, and waits until both are healthy.
- `npm run gallery:sync`: runs one gallery sync against the database and Patreon settings in `.env` and exits (code 1 if it failed). In production: `docker compose run --rm app node src/gallery/sync-now.ts`. The dev server doesn't sync at startup.
- `npm run db:migrate`: applies pending migrations to the database in `.env` (`src/db/migrate.ts`); the app also applies them at startup. In production: `docker compose run --rm app node src/db/migrate.ts`. Migrations must work with the previous release's code (add first, remove in a later release).

## Before finishing a change

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx prettier --check .`, with `npm run db` running so the database tests are included when database code changed. For changes to request handling or conversion, also run a real conversion against a test server and compare the output with the previous version.
