import { execFile, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const ROOT_DIR = path.join(import.meta.dirname, '..');
const SOURCE_DIR = path.join(ROOT_DIR, 'source');
const RESULTS_FILE = path.join(ROOT_DIR, 'bench/results.md');
const PORT = Number(process.env.BENCH_PORT ?? 3160);
const SAMPLE_MS = 100;
const COLUMNS = 6;
const ROWS = 4;
const SQUARES = { x: 120, y: 88 };

const run = promisify(execFile);

interface Point {
  x: number;
  y: number;
}

interface BenchMap {
  name: string;
  source: string;
}

interface BenchCase {
  name: string;
  maps: string[];
  presets: string;
  variants: string;
}

interface BenchResult {
  name: string;
  seconds: number;
  baselineMb: number;
  peakMb: number;
  zipMb: number;
}

const MAPS: BenchMap[] = [
  { name: 'Bench_120x88', source: 'L1_lightOFF' },
  { name: 'Bench_120x88_upper', source: 'L2_lightOFF' },
  { name: 'Bench_120x88_lit', source: 'L1' },
];

const CASES: BenchCase[] = [
  {
    name: 'large.dd2vtt, JPG_70, No grid',
    maps: ['large'],
    presets: 'JPG_70',
    variants: 'NoGrid',
  },
  {
    name: 'large.dd2vtt, JPG_140, Grid',
    maps: ['large'],
    presets: 'JPG_140',
    variants: 'Grid',
  },
  {
    name: 'large.dd2vtt, JPG_70 + JPG_140, both',
    maps: ['large'],
    presets: 'JPG_70,JPG_140',
    variants: 'NoGrid,Grid',
  },
  {
    name: 'Lit map, JPG_70, No grid',
    maps: ['Bench_120x88_lit'],
    presets: 'JPG_70',
    variants: 'NoGrid',
  },
  {
    name: 'JPG_70, No grid',
    maps: ['Bench_120x88'],
    presets: 'JPG_70',
    variants: 'NoGrid',
  },
  {
    name: 'JPG_70, Grid',
    maps: ['Bench_120x88'],
    presets: 'JPG_70',
    variants: 'Grid',
  },
  {
    name: 'JPG_140, Grid',
    maps: ['Bench_120x88'],
    presets: 'JPG_140',
    variants: 'Grid',
  },
  {
    name: 'JPG_70 + JPG_140, both',
    maps: ['Bench_120x88'],
    presets: 'JPG_70,JPG_140',
    variants: 'NoGrid,Grid',
  },
  {
    name: 'Merge 2 levels, JPG_70, both',
    maps: ['Bench_120x88_upper', 'Bench_120x88'],
    presets: 'JPG_70',
    variants: 'NoGrid,Grid',
  },
];

function mapPath(name: string): string {
  return path.join(SOURCE_DIR, `${name}.dd2vtt`);
}

function shift(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

async function createBenchMap({ name, source }: BenchMap): Promise<void> {
  const file = mapPath(name);
  try {
    await fs.access(file);
    return;
  } catch {
    console.log(`Creating ${path.relative(ROOT_DIR, file)}...`);
  }

  const json = JSON.parse(await fs.readFile(mapPath(source), 'utf8')) as Record<
    string,
    unknown
  > & {
    resolution: { map_size: Point; pixels_per_grid: number };
    line_of_sight: Point[][];
    objects_line_of_sight: Point[][];
    portals: { position: Point; bounds: Point[] }[];
    lights: { position: Point }[];
    image: string;
  };
  const tile = json.resolution.map_size;
  const ppg = json.resolution.pixels_per_grid;
  const width = SQUARES.x * ppg;
  const height = SQUARES.y * ppg;
  const image = Buffer.from(json.image, 'base64');

  const overlays = [];
  const lineOfSight: Point[][] = [];
  const objectsLineOfSight: Point[][] = [];
  const portals: typeof json.portals = [];
  const lights: typeof json.lights = [];

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const dx = column * tile.x;
      const dy = row * tile.y;
      const visibleRows = Math.min(tile.y * ppg, height - dy * ppg);
      overlays.push({
        input: await sharp(image)
          .extract({
            left: 0,
            top: 0,
            width: tile.x * ppg,
            height: visibleRows,
          })
          .png()
          .toBuffer(),
        left: dx * ppg,
        top: dy * ppg,
      });
      lineOfSight.push(
        ...json.line_of_sight.map((line) => line.map((p) => shift(p, dx, dy))),
      );
      objectsLineOfSight.push(
        ...json.objects_line_of_sight.map((line) =>
          line.map((p) => shift(p, dx, dy)),
        ),
      );
      portals.push(
        ...json.portals.map((portal) => ({
          ...portal,
          position: shift(portal.position, dx, dy),
          bounds: portal.bounds.map((p) => shift(p, dx, dy)),
        })),
      );
      lights.push(
        ...json.lights
          .map((light) => ({
            ...light,
            position: shift(light.position, dx, dy),
          }))
          .filter((light) => light.position.y < SQUARES.y),
      );
    }
  }

  const png = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();

  await fs.writeFile(
    file,
    JSON.stringify({
      ...json,
      resolution: { ...json.resolution, map_size: SQUARES },
      line_of_sight: lineOfSight,
      objects_line_of_sight: objectsLineOfSight,
      portals,
      lights,
      image: png.toString('base64'),
    }),
  );
}

async function missingMaps(benchCase: BenchCase): Promise<string[]> {
  const missing: string[] = [];
  for (const name of benchCase.maps) {
    try {
      await fs.access(mapPath(name));
    } catch {
      missing.push(name);
    }
  }
  return missing;
}

async function residentMb(pid: number): Promise<number> {
  try {
    const { stdout } = await run('ps', ['-o', 'rss=', '-p', String(pid)]);
    return Number(stdout.trim()) / 1024;
  } catch {
    return 0;
  }
}

async function startServer(): Promise<ChildProcess> {
  const server = spawn(process.execPath, ['src/server.ts'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/config`);
      if (response.ok) {
        return server;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  server.kill();
  throw new Error(`The server did not start on port ${PORT}.`);
}

async function stopServer(server: ChildProcess): Promise<void> {
  if (server.exitCode !== null) {
    return;
  }
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await exited;
}

async function runCase(benchCase: BenchCase): Promise<BenchResult> {
  const server = await startServer();
  const pid = server.pid!;
  try {
    const baselineMb = await residentMb(pid);
    let peakMb = baselineMb;
    const sampler = setInterval(() => {
      void residentMb(pid).then((mb) => {
        peakMb = Math.max(peakMb, mb);
      });
    }, SAMPLE_MS);

    const form = new FormData();
    for (const name of benchCase.maps) {
      form.append('maps', await openAsBlob(mapPath(name)), `${name}.dd2vtt`);
    }
    const query = new URLSearchParams({
      presets: benchCase.presets,
      variants: benchCase.variants,
      name: `${benchCase.maps[0]}.dd2vtt`,
    });

    const started = performance.now();
    const response = await fetch(
      `http://localhost:${PORT}/api/convert?${query}`,
      { method: 'POST', body: form },
    );
    const zip = await response.arrayBuffer();
    const seconds = (performance.now() - started) / 1000;
    clearInterval(sampler);
    peakMb = Math.max(peakMb, await residentMb(pid));

    if (!response.ok) {
      throw new Error(
        `${benchCase.name}: HTTP ${response.status} ${Buffer.from(zip).toString()}`,
      );
    }
    return {
      name: benchCase.name,
      seconds,
      baselineMb,
      peakMb,
      zipMb: zip.byteLength / 1024 / 1024,
    };
  } finally {
    await stopServer(server);
  }
}

async function gitCommit(): Promise<string> {
  try {
    const { stdout: sha } = await run('git', ['rev-parse', '--short', 'HEAD']);
    const { stdout: status } = await run('git', [
      'status',
      '--porcelain',
      '--',
      'src',
    ]);
    return `${sha.trim()}${status.trim() ? ' + uncommitted changes' : ''}`;
  } catch {
    return 'unknown';
  }
}

function formatTable(results: BenchResult[]): string {
  const rows = results.map(
    (r) =>
      `| ${r.name} | ${r.seconds.toFixed(1)} s | ${Math.round(r.peakMb)} MB | ${Math.round(r.peakMb - r.baselineMb)} MB | ${r.zipMb.toFixed(1)} MB |`,
  );
  return [
    '| Case | Time | Peak memory | Added by request | Zip |',
    '|---|---|---|---|---|',
    ...rows,
  ].join('\n');
}

async function main(): Promise<void> {
  for (const map of MAPS) {
    await createBenchMap(map);
  }

  const results: BenchResult[] = [];
  const only = process.env.BENCH_ONLY?.toLowerCase();
  for (const benchCase of CASES) {
    if (only && !benchCase.name.toLowerCase().includes(only)) {
      continue;
    }
    const missing = await missingMaps(benchCase);
    if (missing.length > 0) {
      console.log(
        `${benchCase.name}: skipped, missing ${missing.map((name) => `source/${name}.dd2vtt`).join(', ')}`,
      );
      continue;
    }
    process.stdout.write(`${benchCase.name}... `);
    const result = await runCase(benchCase);
    console.log(
      `${result.seconds.toFixed(1)} s, peak ${Math.round(result.peakMb)} MB`,
    );
    results.push(result);
  }

  const table = formatTable(results);
  const heading = `## ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC, ${await gitCommit()}`;
  const machine = `${os.type()} ${os.arch()}, ${os.cpus()[0]?.model ?? 'unknown CPU'}, Node ${process.version}, map ${SQUARES.x}×${SQUARES.y} squares`;
  console.log(`\n${table}`);

  const existing = await fs
    .readFile(RESULTS_FILE, 'utf8')
    .catch(
      () =>
        '# Benchmark results\n\nAppended by `npm run bench`. Peak memory is the server process RSS, sampled every 100 ms.\n',
    );
  await fs.mkdir(path.dirname(RESULTS_FILE), { recursive: true });
  await fs.writeFile(
    RESULTS_FILE,
    `${existing}\n${heading}\n\n${machine}\n\n${table}\n`,
  );
  console.log(`\nAppended to ${path.relative(ROOT_DIR, RESULTS_FILE)}`);
}

await main();
