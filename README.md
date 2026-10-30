# dungeon-draft-converter

Converts [Dungeondraft](https://dungeondraft.net/) `.dd2vtt` exports into VTT- and print-ready images, in the browser.

## Web app

Upload a `.dd2vtt` file, pick formats and grid variants, optionally add a logo, and download a zip ([layout](#output)).

### Docker

```sh
docker compose up -d --build
```

Open http://localhost:3000. To use a different port, run `HOST_PORT=8080 docker compose up -d --build`.

`docker compose logs -f` follows the logs; `docker compose down` stops it.

### Without Docker

Requires Node.js 24.2 or newer.

```sh
npm install
npm run build
npm start
```

## Output

The zip contains:

```
<Name>/
├── FOUNDRY_VTT_DD2VTT/   # copy of the original for Foundry VTT
├── JPG_70/               # <Name>_70px_NoGrid.jpg + <Name>_70px_Grid.jpg
├── JPG_140/
├── JPG_300/
└── WEBP_140/
```

Each preset resizes the map so one grid square is 70 / 140 / 300 pixels and tags the file with the matching DPI, so prints come out at 1 inch per square. The `Grid` variant has a dashed grid drawn on top; it's skipped (and no resizing happens) if the file has no `resolution.pixels_per_grid`.

The zip contains only the presets and variants you selected. If you add a logo (PNG, JPG or WebP, up to 5 MB), it's placed in the bottom-right corner of every image. Its size (2–20%) and margin (0–5%) are set in the page, as a percentage of the map's shorter side.

## Maps exported without lighting

If a map was exported from Dungeondraft with lighting turned off, the app lights the images itself: the map is darkened to the ambient light, then every light in the file is added with a smooth falloff, and walls and closed doors cast shadows. Dungeondraft's ring textures aren't reproduced, because the `.dd2vtt` doesn't say which one a light uses. The copy in `FOUNDRY_VTT_DD2VTT` stays unlit, so Foundry can do its own lighting.

## Combining levels

In the web app you can upload up to 10 maps of the same size and grid, for example an upper floor and the ground floor below it. The top map in the list is the main map; the maps below it are drawn underneath, in list order. You get one set of images and one merged `.dd2vtt`, named `<Main>_merged`:

- **Image:** the levels are stacked as they are. Dungeondraft bakes each level's lighting into its own image, so every level stays lit exactly once; merging in Dungeondraft lights the whole map again and makes it darker. If any level was exported without lighting, the app lights the levels itself first ([see above](#maps-exported-without-lighting)), and the merged `.dd2vtt` stays unlit for Foundry.
- **Walls and doors:** from the main map only.
- **Lights:** all of the main map's lights, plus the lights of lower levels that aren't covered by a level above them (a level counts as covering a light where it's at least 50% opaque).

## Limits

The web app rejects:

- maps over 200 MB each, or over 400 MB for all files together
- more than 10 maps at once
- map images that aren't PNG, JPG or WebP
- map images over 200 megapixels, and outputs over 250 megapixels
- WebP outputs wider or taller than 16383 px (a WebP format limit)

Big maps need a lot of memory: a 12800×8800 map takes about 1.4 GB to convert at 140 px per square, and up to about 1.9 GB when you pick several formats, which is why Docker gets 4 GB. The web app converts one map at a time, making up to 2 of its images in parallel. Up to 10 requests can be in progress at once (uploading, waiting or converting); beyond that it answers "busy, try again". While a request waits, the page shows how many maps are ahead of it. A conversion that takes longer than 5 minutes is stopped.

Waiting uploads are kept on disk, not in memory: each request takes up to about 1 GB of temporary disk space (the upload plus its decoded image). The map being converted also writes uncompressed working images, up to about 2 GB for the largest maps. Leave about 12 GB free.

## Server settings

Environment variables, all optional:

| Variable                     | Default   | What it does                                                                     |
| ---------------------------- | --------- | -------------------------------------------------------------------------------- |
| `PORT`                       | `3000`    | Port the server listens on (in Docker, set `HOST_PORT` instead)                  |
| `CONVERSION_TIMEOUT_SECONDS` | `300`     | Stop a conversion that takes longer                                              |
| `MAX_PARALLEL_IMAGES`        | `2`       | Images of one map made at the same time; more is not faster and uses more memory |
| `SHARP_CONCURRENCY`          | all cores | Threads per image; fewer uses less memory but is slower                          |

The Docker image also uses jemalloc with `MALLOC_CONF` set to return freed memory to the system quickly.

## Development

```sh
npm run dev
```

Starts the server on http://localhost:3000 with hot reload: Vite runs inside Express, so the API and the page share one port. Use `PORT=3001 npm run dev` to change it.

`npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`

`npm run bench` measures time and peak memory per request and appends the results to `bench/results.md`. It creates its test maps in `source/` on the first run. `BENCH_TARGET=docker` runs it against the Docker image (rebuilt first) instead of a local server, and `BENCH_DOCKER_ENV="MAX_PARALLEL_IMAGES=1 …"` passes [server settings](#server-settings) to that container. `BENCH_ONLY=<text>` runs only the cases whose name contains that text, and `BENCH_PORT` changes the port the benchmark server uses (default 3160).
