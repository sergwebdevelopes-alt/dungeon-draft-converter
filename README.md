# dungeon-draft-converter

Converts [Dungeondraft](https://dungeondraft.net/) `.dd2vtt` exports into VTT- and print-ready images, from the browser or the command line.

## Web app

Upload a `.dd2vtt` file, pick formats and grid variants, optionally add a logo, and download a zip with the [same layout as the command line](#output).

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

## Command line

Put your `.dd2vtt` files into `source/`, then either double-click **`Convert Maps.command`** (macOS, no terminal needed) or run:

```sh
npm install
npm run convert
```

Results land in `dist/`, which is wiped on every run.

## Output

For each map:

```
dist/<Name>/
├── FOUNDRY_VTT_DD2VTT/   # copy of the original for Foundry VTT
├── JPG_70/               # <Name>_70px_NoGrid.jpg + <Name>_70px_Grid.jpg
├── JPG_140/
├── JPG_300/
└── WEBP_140/
```

Each preset resizes the map so one grid square is 70 / 140 / 300 pixels and tags the file with the matching DPI, so prints come out at 1 inch per square. The `Grid` variant has a dashed grid drawn on top; it's skipped (and no resizing happens) if the file has no `resolution.pixels_per_grid`.

The web app's zip contains only the presets and variants you selected. If you add a logo (PNG, JPG or WebP, up to 5 MB), it's placed in the bottom-right corner of every image. Its size (2–20%) and margin (0–5%) are set in the page, as a percentage of the map's shorter side.

## Combining levels

In the web app you can upload up to 10 maps of the same size and grid, for example an upper floor and the ground floor below it. The top map in the list is the main map; the maps below it are drawn underneath, in list order. You get one set of images and one merged `.dd2vtt`, named `<Main>_merged`:

- **Image:** the levels are stacked as they are. Dungeondraft bakes each level's lighting into its own image, so every level stays lit exactly once; merging in Dungeondraft lights the whole map again and makes it darker.
- **Walls and doors:** from the main map only.
- **Lights:** all of the main map's lights, plus the lights of lower levels that aren't covered by a level above them (a level counts as covering a light where it's at least 50% opaque).

## Limits

The web app rejects:

- maps over 200 MB each, or over 400 MB for all files together
- more than 10 maps at once
- map images that aren't PNG, JPG or WebP
- map images over 200 megapixels, and outputs over 250 megapixels
- WebP outputs wider or taller than 16383 px (a WebP format limit)

Big maps need a lot of memory: a 12800×8800 map takes about 2.7 GB to convert at 140 px per square, which is why Docker gets 4 GB. The web app converts one map at a time and handles up to 2 requests at once (uploading, waiting or converting); beyond that it answers "busy, try again".

## Development

```sh
npm run dev
```

Starts the server on http://localhost:3000 with hot reload: Vite runs inside Express, so the API and the page share one port. Use `PORT=3001 npm run dev` to change it.

`npm test` · `npm run typecheck` · `npm run lint` · `npm run format` · `npm run build`
