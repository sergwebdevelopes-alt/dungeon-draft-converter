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

## Code style

- No comments in code unless asked.
- Small named functions; separate steps with blank lines (see `src/http/convert/handler.ts`).
- `async`/`await` with `try`/`catch` rather than `.then()` chains.
- User-facing sizes and durations go through `src/utils/format.ts`.

## Commands

- `npm run dev`: dev server with hot reload on port 3000 (the user's own dev server usually runs there; use another port for test servers and stop them by PID, never with a pattern kill).
- `npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`
- `npm run bench`: takes minutes; run it only when asked. `BENCH_TARGET=docker` measures the Docker image.
- Docker: `docker compose up -d --build` (use `HOST_PORT=3001` when the dev server is on 3000).

## Before finishing a change

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx prettier --check .`. For changes to request handling or conversion, also run a real conversion against a test server and compare the output with the previous version.
