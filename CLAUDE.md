# CLAUDE.md

Web app that converts Dungeondraft `.dd2vtt` exports into VTT- and print-ready images (Express + React/Vite, sharp, Docker). See README.md for features, limits and settings.

## Rules

- **Every external library goes behind a port.** Define our own contract (interface or function type) and put the library in one adapter file that implements it. The rest of the code uses only the contract, so switching libraries means writing a new adapter, not changing callers. Examples: `src/features/converter/ports/zip-writer.ts` (port) with `src/features/converter/adapters/fflate-zip-writer.ts` (the only file that imports fflate), and `src/features/converter/ports/multipart-parser.ts` (port) with `src/features/converter/adapters/multer-multipart-parser.ts` (the only file that imports multer).
- **Change only what the task needs.** Don't refactor, rename, move or tidy existing code while doing something else. Add the new code next to the old and touch old files only where the task requires it. Suggest a refactor separately and wait for a yes.
- **Every change is covered by tests.** New behaviour gets new tests; changed behaviour gets updated tests. Tests live next to the code as `*.test.ts` (for example `src/features/converter/http/parse-convert-request.test.ts`) and run with `npm test`. Check that a new test fails without the change it covers.

## Architecture

The back end mirrors the front end: features under `src/features/`, technology under `src/infrastructure/`, small helpers under `src/shared/`, and the startup files directly in `src/`.

### The words, in this project's terms

- **Domain** (`features/<feature>/domain/`): pure rules and data shapes. No I/O, no libraries, no `config.ts`; settings are passed in. Example: `gallery/domain/post-to-map-record.ts` (a public post in a collection becomes a map).
- **Application** (`application/`): use cases, the steps of what a feature does, using the domain and reaching the outside only through ports. Example: `gallery/application/sync-gallery.ts`.
- **Port** (`ports/`): an interface we define for something a use case needs from outside. Example: `gallery/ports/map-repository.ts`.
- **Adapter** (`adapters/`): one implementation of a port with one technology, named `<technology>-<port>.ts`. It is the only file that imports that library. Example: `gallery/adapters/postgres-map-repository.ts`, `converter/adapters/fflate-zip-writer.ts`.
- **Entry points:** where work starts. A feature's `http/routes.ts` (all its endpoints, `createRoutes(deps)`), its `jobs/`, and the scripts in `src/cli/`.
- **Contracts** (`src/contracts/`): the shapes the server and the web app exchange, in files that import nothing. Every layer may use them, and they're the only server code the web app imports.
- **Composition root:** `server.ts`, `app.ts`, `create-gallery.ts`, `start-jobs.ts` and `cli/`, the only code that knows every piece. It builds the adapters and hands them in.

### Dependency rule

`domain ← application ← adapters / http / jobs ← composition root`

- The domain imports only other domain files, `shared/` and `contracts/`: no packages, no Node modules, no `config.ts`.
- The application imports only its domain, its ports, `shared/` and `contracts/`.
- `infrastructure/` and `shared/` never import a feature; `shared/` imports no packages, `infrastructure/` or `config.ts`; `contracts/` imports nothing; one feature never imports another.
- oxlint enforces these rules with `no-restricted-imports` overrides in `.oxlintrc.json`, so a wrong import fails `npm run lint`. A later override replaces an earlier one, so each folder's list repeats the "one feature never imports another" pattern, which names the features (`(converter|gallery)`).

### Tree

```
src/
├── server.ts            start: settings check, database, the one gallery sync, jobs, HTTP server, SIGTERM
├── app.ts               the Express app: shared middleware, then health + converter.createRoutes + gallery.createRoutes under /api
├── create-gallery.ts    gallery stores and the stoppable sync from settings (none without database or Patreon settings)
├── start-jobs.ts        starts every scheduled job
├── config.ts            every process.env read and every limit
├── cli/                 migrate-database.ts (npm run db:migrate), sync-gallery-once.ts (npm run gallery:sync)
├── settings/            read-settings.ts (Zod, the only file importing zod), stop-on-bad-settings.ts
├── contracts/           what the server and the web app exchange; imports nothing: converter-api (presets, variants, logo limits, ConfigResponse, QueuePosition), gallery-api (MapEntry, MapsResponse, Squares), grid-stroke
├── features/
│   ├── converter/       .dd2vtt → VTT and print images
│   │   ├── domain/            dd2vtt-metadata, loaded-map
│   │   ├── application/       convert-levels, conversion-queue (parallel slots, FIFO line, positions), pending-limit, check-limit
│   │   ├── image-processing/  sharp-based: read-dd2vtt-file, render-map-images, bake-lighting, merge-levels, draw-grid
│   │   ├── ports/             zip-writer, multipart-parser
│   │   ├── adapters/          fflate-zip-writer, multer-multipart-parser
│   │   ├── http/              routes (/config, /queue/:ticket, /convert), convert-handler, parse-convert-request, conversion-log, stream-zip, upload/
│   │   └── jobs/              upload-cleanup-job
│   └── gallery/         Patreon posts → the public map gallery
│       ├── domain/            map-record, post-to-map-record, parse-post-title, choose-map-image, collection-chips, map-slugs, map-image-keys, gallery-sync-plan, sync-freshness, map-summary, choose-patreon-tokens, patreon-post, patreon-tokens, tidy-text
│       ├── application/       sync-gallery (Patreon posts → maps, saved in one transaction, one run at a time), prepare-map-images (renders the missing files of every image of a map; a failed cover keeps the previous version, a failed extra image is left out)
│       ├── ports/             map-repository, image-storage, map-image-renderer, map-image-source, patreon-posts, patreon-post-details, patreon-token-repository, html-sanitizer, gallery-stores
│       ├── adapters/          postgres-map-repository, postgres-patreon-token-repository, local-image-storage, sharp-map-image-renderer, http-map-image-source, patreon-api-posts, patreon-website-post-details, patreon-token-refresher, sanitize-html-sanitizer
│       ├── http/              routes (/maps, /maps/:slug, /patreon/webhook), parse-maps-query, map-entry (the /api/maps shape), patreon-webhook-signature, serve-map-images (/maps/*)
│       └── jobs/              gallery-sync-job
├── infrastructure/      technology used by several features
│   ├── database/        Database port + pg adapter (the only file importing pg), open-database, run-migrations, migrations/*.sql, advisory-locks, test-database
│   ├── http-client/     HttpClient port (get, getBytes, post, timeout, abort) + fetch adapter (the only server file using fetch) + rate-limited client
│   ├── http-server/     Express middleware: http-errors, security, refuse-work-during-shutdown, cache-control, serve-precompressed, serve-web-app, http-methods, health-route
│   └── scheduler/       schedule() (timer, optional run at start, stop)
└── shared/              helpers any layer may use, without I/O or libraries: errors.ts, utils/ (format, time, object, error-message, single-flight)
```

- **Known exception:** `features/converter/image-processing/` uses `sharp` directly, and `application/convert-levels.ts` imports it (allowed in `.oxlintrc.json` for that file only). A follow-up may put it behind ports.
- **The gallery's details:**
  - The official adapter refreshes the Patreon token on 401 through `patreon-token-refresher.ts`.
  - The newest token pair is stored in Postgres. `seeded_from` is the SHA-256 of the `.env` refresh token it started from, so a new `.env` pair wins.
  - Post HTML is sanitised once, in the sync.
- **Settings:** `settings/read-settings.ts` validates the database and gallery settings with a Zod schema behind `readSettings(env) → { settings, problems }`. `config.ts` calls it with `process.env`. `server.ts` and `cli/migrate-database.ts` stop with the list of problems if any. Patreon settings are all or nothing.
- **`config.ts`:**
  - `process.env` is read only there.
  - Settings and limits live there (sizes, timeouts, folders), and so do outside services' URLs, page sizes, user agents, tags, IDs and other values someone might want to change.
  - Facts about formats and output stay next to the code that produces them (file extensions, zip folder names, image encoding constants), and so do details that are part of an API's contract (field lists, query parameter names).
- **Outgoing HTTP** goes through `infrastructure/http-client/` (`HttpClient`, `HttpClientError`). Adapters receive the client as an argument, never `fetch` itself.
- **Adapters only translate:** they fetch and translate into our types, with no business rules.
- **Errors:** they extend `InvalidInputError` (→ 400) or `UnprocessableError` (→ 422) from `shared/errors.ts`, and `infrastructure/http-server/http-errors.ts` maps them by kind. HTTP-only errors use `HttpError`.
- **Dependencies are passed in**, not kept in module-level globals. For example, `createApp` creates the `ConversionQueue` and hands it to `converter.createRoutes`.
- **Imports stay relative** in the back end. Node runs the `.ts` files directly and ignores tsconfig `paths`, so the `@/` and `@contracts/` aliases are for the web app only.
- **No barrels:** no `index.ts` files in the back end. (A front-end feature's `index.ts` is its entry; see Front end.)

### Adding a feature

1. Create `src/features/<feature>/` with only the subfolders it needs: `domain/`, `application/`, `ports/`, `adapters/`, `http/`, `jobs/`.
2. Put its endpoints in `http/routes.ts`, exporting `createRoutes(deps)`, and mount it in `app.ts` as `import * as <feature> from './features/<feature>/http/routes.ts'`.
3. Build its adapters in the composition root (a `create-<feature>.ts` if it needs settings) and pass them in. Add its jobs to `start-jobs.ts`.
4. Tests go next to each file. Route tests go in `http/routes.test.ts`, one `describe` per endpoint.
5. Add its name to the feature list in the `.oxlintrc.json` "One feature never imports another" patterns.

### Adding a port and its adapter

1. Write the interface in `ports/<name>.ts` with only the methods the use case needs. Its data shapes live in `domain/`.
2. Implement it in `adapters/<technology>-<name>.ts`, the only file that imports that library.
3. The use case receives the port as an argument and never imports the adapter. The composition root creates the adapter and passes it in.
4. Test the use case with a fake of the port, and the adapter against the real technology where possible (for example the test Postgres).

### Front end (`web/`)

Four layers, each importing only from the ones below it: `app → pages → features → shared`.

```
web/src/
├── app/           entry, App, routes (pages load lazily), layout (header, footer, page shell)
├── pages/         one folder per page; a page puts features together and adds its own heading
│   ├── home/        HomePage and its own parts: Hero with its Backdrop, LatestMaps, ConverterTeaser, LevelStack (levels of one map merging; its images in level-stack/ come from scripts/render-level-stack.ts)
│   ├── gallery/     GalleryPage (heading + MapGallery + MembershipSection)
│   ├── converter/   ConverterPage (heading + ConverterForm)
│   └── not-found/   NotFoundPage
├── features/<feature>/   converter, gallery, membership
│   ├── index.ts   the feature's only entry for pages
│   ├── api/       the feature's contract over HttpClient, plus a ready instance (`gallery-api.ts`, `converter-api.ts`)
│   ├── model/     pure TypeScript (no React, no fetch, no storage): types, rules, reducer
│   ├── hooks/     hooks joining model and api (effects only)
│   ├── workers/   Web Worker entries for heavy work (converter: reading a .dd2vtt preview), each with an adapter that falls back to the page where workers are missing
│   └── ui/        presentational components: data and callbacks through props
└── shared/
    ├── http/      HttpClient port + fetch adapter (only file using fetch); index.ts exports the `http` instance
    ├── storage/   KeyValueStore port + localStorage adapter; index.ts exports `storage`
    ├── lib/       small helpers without React: format, save-file, abortable, zoom (scale and pan limits), zoom-gestures (wheel, drag and pinch on an element), page-title
    ├── hooks/     shared hooks, one per file: useObjectUrl, useFileDrop, useElapsed, useRotation, useNearViewport, useInView, useLoadedImages, useScrollLock, useModalDialog, useArrowKeys, useZoom, usePageTitle
    ├── analytics/ cloudflare-analytics: adds the Cloudflare Web Analytics beacon only on the site's domain (token and domain in config/site.ts; the server's CSP allows its two origins)
    ├── theme/     light/dark choice (storage port) + toggle; web/public/theme.js applies a saved choice before React starts
    ├── ui/        shared presentational components (Button/ButtonLink, Alert, Segmented, GridOverlay, ZoomPan, …)
    └── config/    site.ts (site name, nav, links, membership plans)
```

- **Layer rules,** enforced by oxlint (`no-restricted-imports` blocks for `web/src/**` in `.oxlintrc.json`):
  - `shared/` imports nothing from `features/`, `pages/` or `app/`.
  - A feature imports nothing from `pages/` or `app/`, and never another feature. A page puts features together (for example `GalleryPage` adds `MembershipSection` below `MapGallery`).
  - A page uses a feature only through its `index.ts`, and never imports another page or `app/`.
  - `app/` uses a feature through its `index.ts`. The one exception: `routes.tsx` imports `galleryApi` from the feature's `api/` to prefetch the first page of maps without loading the gallery's UI.
- A feature keeps only `index.ts` at its root; everything else goes in `api/`, `model/`, `hooks/`, `workers/` or `ui/` (only the folders it needs). Unlike the back end, a front-end feature's `index.ts` is its entry, not a barrel to avoid.
- Feature modules run nothing when imported. `vite.config.ts` tells the bundler so (`moduleSideEffects`), which keeps a page from loading the parts of a feature's `index.ts` it does not use. After changing what an `index.ts` exports or what a page imports, compare the files in `web/dist/assets` before and after `npm run build`.
- **Imports:** inside one feature or page, relative (`../model/catalog.ts`). To another layer, `@/` from `web/src` (`@/shared/ui/Alert.tsx`, `@/features/gallery/index.ts`). Server contracts, `@contracts/` (`@contracts/gallery-api.ts`). The aliases are set in `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`).
- **Adding a page:** a folder in `pages/` with `<Name>Page.tsx`, loaded lazily in `app/routes.tsx`. Parts only that page uses live next to it.
- **Adding a feature:** a folder in `features/` with `index.ts` and the folders it needs, and its name in the "One feature never imports another" pattern in `.oxlintrc.json`.
- In `shared/`, a hook (`useX`) goes in `hooks/` and a helper without React goes in `lib/`; the two are never mixed in one folder.
- `shared/ui/` holds only presentational components any page may use. Logic a component needs goes in `lib/` or `hooks/`, and a part only one page uses lives next to that page.
- Components never fetch or touch storage; logic goes in `model/` with its own tests.
- A feature reaches the network only through its `api/`, and storage only through `shared/storage`.
- No DI container: modules export ready instances (`http`, `storage`, `converterApi`); hooks take them as default parameters so tests can pass fakes.
- The ports rule covers runtime libraries (HTTP, storage, animation). UI frameworks and build tools (React, Tailwind, Vite, Vitest) are used directly.
- Membership plans live in `web/src/shared/config/site.ts` (`membership.plans`); adding a Patreon tier means adding one entry there. Pages use `Container` for width and padding; sections may run full width.
- The web app imports from the server only `src/contracts/` (API shapes and the export grid style), always as `@contracts/…`, and `web/src/server-imports.test.ts` enforces this. The server checks its JSON answers against the same types (`satisfies ConfigResponse` / `MapsResponse` / `QueuePosition`), so a change to the API breaks typecheck on both sides.
- Use the shared `Button`/`ButtonLink`, `Alert` and `Segmented` instead of repeating their classes.
- Motion is imported only in `web/src/shared/ui/motion/`; features use its wrappers (`MotionProvider`, `Reveal`, `SharedFrame`, `SwipeCarousel`).
- Patreon post HTML is sanitised once, in the sync (the official adapter gets the sanitiser passed in), and stored as `maps.description`; the modal inserts it with `dangerouslySetInnerHTML` in `MapDescription.tsx`, the only place raw HTML is rendered.
- The gallery loads `GET /api/maps`, filled by the Patreon sync (public posts in any Patreon collection; collection names become filter chips). It loads page by page (`?tag=&offset=&limit=`, answering `{ maps, total, tags }`): 21 maps first, then 24 at a time as the visitor scrolls (`model/map-pages.ts`, `useMapPages`), with a "Show more maps" button as the fallback. The collection filter runs on the server. A link to a map that is not loaded yet uses `GET /api/maps/:slug`. The home page and the gallery share the first page, loaded once. The web `MapEntry` comes from `src/contracts/gallery-api.ts`; `subtitle` and `squares` are optional, so the grid choice and the converter teaser appear only for maps with squares. The modal draws its grid with `GridOverlay`, so no gridded image is needed.
- A map keeps every image of its post (`MapRecord.images`, the cover first; gridded copies are left out when the post has no-grid images). The cover gets `card`, `view` and `backdrop` files, the other images `view` and `thumb`, and the cover a `thumb` too when the map has several. Image sizes are measured from the files, because Patreon's can be wrong. Maps with several images carry `pictures` in `MapEntry`; the modal shows them with a thumbnail strip (`PictureStrip`), and swipe, arrow keys and arrow buttons go round the pictures of that map. The modal does not move between maps.
- Styling uses Tailwind with colour and font tokens in `web/src/styles.css`.

## Code style

- No comments in code unless asked.
- Clear names: a name says what the thing is or does in plain words, so the code reads without looking inside it (`coverImage(map)`, `mapPictures(map)`, `coverImageFromRow(row)`). No `Of` suffix (`coverOf`, `picturesOf`), no abbreviations, no vague words like `data`, `info` or `more` (`more_images`).
- Small named functions; separate steps with blank lines (see `src/features/converter/http/convert-handler.ts`).
- `async`/`await` with `try`/`catch` rather than `.then()` chains.
- User-facing sizes and durations go through `src/shared/utils/format.ts`.

## Commands

- `npm run dev`: dev server with hot reload on port 3000. Env files are loaded by preloading dotenv in the npm scripts (`node --import dotenv/config`), never imported in code: `npm run dev` reads `.env`, `npm test` reads `.env.testing` (`DOTENV_CONFIG_PATH`); values set in the shell win. Don't use Node's `--env-file` flag with `--watch-path`: in Node 24 it makes the dev server restart in a loop.
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`
- TypeScript 7 (the native compiler, `tsc`). Linting is oxlint with its type-aware rules (`oxlint-tsgolint`), configured in `.oxlintrc.json`: the ESLint-recommended and typescript-eslint recommended-type-checked rules; type-aware rules are off for plain `.js` files. Prettier does the formatting.
- Database tests run with plain `npm test` against the test Postgres from `npm run db` (`postgres-test` in `compose.dev.yml`: user/password/database `test`, `127.0.0.1:5433`, in-memory data). `.env.testing` (committed, no secrets) points at it; without that database they fail with "Start it with npm run db". They use `createTestDatabase()` from `src/infrastructure/database/test-database.ts`, which creates an empty `test_<random>` database (per file, or per test where each test needs a fresh one) and drops it afterwards.
- `npm run build` also writes `.br`/`.gz` copies of text files in `web/dist` (`scripts/precompress.ts`); `src/infrastructure/http-server/serve-precompressed.ts` serves them, and `src/infrastructure/http-server/cache-control.ts` decides caching per path.
- `npm run bench`: takes minutes; run it only when asked. `BENCH_TARGET=docker` measures the Docker image.
- Docker: `docker compose up -d --build` (use `HOST_PORT=3001` when the dev server is on 3000). It needs `POSTGRES_USER` and `POSTGRES_PASSWORD` in `.env` (see `.env.example`; `POSTGRES_DB` defaults to the user). The database is configured by separate `POSTGRES_HOST/PORT/USER/PASSWORD/DB` settings, never a URL; compose sets `POSTGRES_HOST=postgres` for the app. The `app` container is named `dd-converter`; for test runs use a separate project (`-p`) with an override that renames containers and the image, so the user's container is never replaced.
- Local redeploy of the user's container: `HOST_PORT=3001 docker compose up -d --build --no-deps app`. `compose.dev.yml` extends the same project and shares `dd-postgres` with `npm run dev`; a plain `docker compose up` would recreate `dd-postgres` without the 5432 port.
- Production: step-by-step notes in `docs/deploy.md` (local only, gitignored: it holds server details). On every push to `main`, `.github/workflows/release.yml` runs the checks (`typecheck`, `lint`, `prettier --check .`, `npm run test:ci`: every test except the five Postgres ones), builds the image to `ghcr.io` (tags `latest` and the commit sha) and calls `deploy.yml`, which runs `deploy/deploy-app.sh <sha>` on the server over SSH with a key limited to that command (secrets in the `production` environment) and checks `/api/health`. The script fetches that commit's `compose.yml` and `compose.prod.yml`, pins `APP_TAG=<sha>` in the server's `.env` and runs `docker compose up -d --wait`; a rollback is the Deploy workflow run by hand with an older sha. The server keeps no clone of the repository, only `~/apps/lair` with the compose files and `.env`. The server runs `compose.yml` + `compose.prod.yml` (that image, no public port, on the external `web` network) behind one shared Caddy (`deploy/caddy/`, domain from `SITE_DOMAIN`). `deploy/backup-database.sh` dumps the database nightly.
- Patreon refuses its website API (`www.patreon.com/api/posts`, collections and attachments) from datacenter IPs with 403, while the official API works. On the server, `PATREON_WEBSITE_API_URL` points at a Cloudflare Worker (`deploy/patreon-relay/worker.js`, tests in `worker.test.mjs`) that forwards only `GET /api/posts` with the `X-Relay-Key` header (`PATREON_RELAY_KEY`) and rewrites `links.next` to itself.
- `npm run db`: starts the dev Postgres (`127.0.0.1:5432`, for `npm run dev`; `POSTGRES_DEV_BIND=0.0.0.0` in `.env` publishes it on the local network) and the test Postgres (`127.0.0.1:5433`, for `npm test`) from `compose.dev.yml`, and waits until both are healthy.
- `npm run gallery:sync`: runs one gallery sync against the database and Patreon settings in `.env` and exits (code 1 if it failed). In production: `docker compose run --rm app node src/cli/sync-gallery-once.ts`. The dev server doesn't sync at startup.
- `npm run db:migrate`: applies pending migrations to the database in `.env` (`src/cli/migrate-database.ts`); the app also applies them at startup. In production: `docker compose run --rm app node src/cli/migrate-database.ts`. Migrations must work with the previous release's code (add first, remove in a later release).

## Before finishing a change

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx prettier --check .`, with `npm run db` running so the database tests are included when database code changed. For changes to request handling or conversion, also run a real conversion against a test server and compare the output with the previous version.
