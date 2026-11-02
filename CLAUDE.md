# CLAUDE.md

Web app that converts Dungeondraft `.dd2vtt` exports into VTT- and print-ready images (Express + React/Vite, sharp, Docker). See README.md for features, limits and settings.

## Rules

- **Every external library goes behind a port.** Define our own contract (interface or function type) and put the library in one adapter file that implements it. The rest of the code uses only the contract, so switching libraries means writing a new adapter, not changing callers. Examples: `src/zip/zip-writer.ts` (port) with `src/zip/fflate-zip-writer.ts` (the only file that imports fflate), and `src/http/upload/multipart-parser.ts` (port) with `src/http/upload/multer-multipart-parser.ts` (the only file that imports multer).
- **Every change is covered by tests.** New behaviour gets new tests; changed behaviour gets updated tests. Tests live next to the code as `*.test.ts` (for example `src/http/convert/request.test.ts`) and run with `npm test`. Check that a new test fails without the change it covers.

## Architecture

```
src/
├── server.ts      startup only: http server, listen, cleanup timer, SIGTERM
├── app.ts         builds the Express app and wires dependencies (queue, routes)
├── config.ts      every process.env read and every limit
├── http/          Express only: routes, request parsing, errors, zip streaming
│   └── upload/    upload rules, per-request temp folder, multipart port + multer adapter
├── queue/         PendingLimit (busy limit) and ConversionQueue (parallel slots, FIFO line, positions; cancel via AbortSignal)
├── zip/           zip port + fflate adapter
├── core/          image work: dd2vtt format, conversion, images, lighting, merge
└── utils/         small shared helpers (format.ts)
```

- `core/` and `queue/` never import Express or multer.
- `process.env` is read only in `config.ts`. Settings and limits (sizes, timeouts, folders) live there; facts about formats and output (file extensions, zip folder names, image encoding constants) stay next to the code that produces them.
- Core errors extend `InvalidInputError` (→ 400) or `UnprocessableError` (→ 422) from `core/errors.ts`; `http/errors.ts` maps them by kind. HTTP-only errors use `HttpError`.
- Dependencies are passed in (for example `createApp` creates the `ConversionQueue` and hands it to the routes), not kept in module-level globals.

### Front end (`web/`)

```
web/src/
├── app/           entry, App, layout (header, footer, page shell)
├── shared/
│   ├── http/      HttpClient port + fetch adapter (only file using fetch); index.ts exports the `http` instance
│   ├── storage/   KeyValueStore port + localStorage adapter; index.ts exports `storage`
│   ├── lib/       format.ts, save-file.ts, useObjectUrl.ts
│   ├── ui/        shared presentational components
│   └── config/    site.ts (site name, nav, Patreon link)
└── features/<feature>/
    ├── api.ts     the feature's contract over HttpClient, plus a ready instance
    ├── model/     pure TypeScript (no React, no fetch, no storage): types, rules, reducer
    ├── use*.ts    the hook joining model and api (effects only)
    └── ui/        presentational components: data and callbacks through props
```

- Components never fetch or touch storage; logic goes in `model/` with its own tests.
- A feature reaches the network only through its `api.ts`, and storage only through `shared/storage`.
- No DI container: modules export ready instances (`http`, `storage`, `converterApi`); hooks take them as default parameters so tests can pass fakes.
- The ports rule covers runtime libraries (HTTP, storage, animation). UI frameworks and build tools (React, Tailwind, Vite, Vitest) are used directly.
- Motion is imported only in `web/src/shared/ui/motion/`; features use its wrappers (`MotionProvider`, `Reveal`, `SharedFrame`, `Swipeable`).
- Maps live in `content/maps.json` (title, tags, Patreon link, source images). `npm run gallery` renders `web/public/maps/` from it, including the public `catalog.json` the gallery loads at runtime; never edit those files by hand. Adding a map needs no code change. The script never reads `Tych Maps` (client work).
- Styling uses Tailwind with colour and font tokens in `web/src/styles.css`.

## Code style

- No comments in code unless asked.
- Small named functions; separate steps with blank lines (see `src/http/convert/handler.ts`).
- `async`/`await` with `try`/`catch` rather than `.then()` chains.
- User-facing sizes and durations go through `src/utils/format.ts`.

## Commands

- `npm run dev`: dev server with hot reload on port 3000 (the user's own dev server usually runs there; use another port for test servers and stop them by PID, never with a pattern kill).
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`
- `npm run gallery -- --src ~/Desktop/Maps [--manifest content/maps.json] [--out web/public/maps]`: regenerates gallery images and `catalog.json` (about 25 s).
- `npm run bench`: takes minutes; run it only when asked. `BENCH_TARGET=docker` measures the Docker image.
- Docker: `docker compose up -d --build` (use `HOST_PORT=3001` when the dev server is on 3000).

## Before finishing a change

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx prettier --check .`. For changes to request handling or conversion, also run a real conversion against a test server and compare the output with the previous version.
