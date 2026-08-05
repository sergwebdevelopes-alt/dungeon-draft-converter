# dungeon-draft-converter

Converts [Dungeondraft](https://dungeondraft.net/) `.dd2vtt` exports into VTT- and print-ready images.

## Usage

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

## Development

`npm test` · `npm run typecheck` · `npm run lint` · `npm run format`
