import { execFile, spawn } from 'node:child_process';
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
const TARGET = process.env.BENCH_TARGET === 'docker' ? 'docker' : 'local';
const DOCKER_IMAGE = 'dungeon-draft-converter';
const DOCKER_CONTAINER = 'dd-bench';
const DOCKER_MEMORY = '4g';
const DOCKER_ENV = (process.env.BENCH_DOCKER_ENV ?? '')
  .split(/\s+/)
  .filter(Boolean);

const run = promisify(execFile);

interface Point {
  x: number;
  y: number;
}

interface BenchMap {
  name: string;
  source: string;
  squares: Point;
}

interface BenchCase {
  name: string;
  maps: string[];
  presets: string;
  variants: string;
}

interface BenchServer {
  residentMb(): Promise<number>;
  peakMb(): Promise<number>;
  stop(): Promise<void>;
}

interface BenchResult {
  name: string;
  seconds: number;
  baselineMb: number;
  peakMb: number;
  zipMb: number;
}

const MAPS: BenchMap[] = [
  { name: 'Bench_120x88', source: 'L1_lightOFF', squares: { x: 120, y: 88 } },
  {
    name: 'Bench_120x88_upper',
    source: 'L2_lightOFF',
    squares: { x: 120, y: 88 },
  },
  { name: 'Bench_120x88_lit', source: 'L1', squares: { x: 120, y: 88 } },
  { name: 'Bench_60x44', source: 'L1_lightOFF', squares: { x: 60, y: 44 } },
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
    name: 'Unlit 60×44, all presets, both',
    maps: ['Bench_60x44'],
    presets: 'JPG_70,JPG_140,JPG_300,WEBP_140',
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

async function createBenchMap({
  name,
  source,
  squares,
}: BenchMap): Promise<void> {
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
  const width = squares.x * ppg;
  const height = squares.y * ppg;
  const image = Buffer.from(json.image, 'base64');

  const overlays = [];
  const lineOfSight: Point[][] = [];
  const objectsLineOfSight: Point[][] = [];
  const portals: typeof json.portals = [];
  const lights: typeof json.lights = [];

  const columns = Math.ceil(squares.x / tile.x);
  const rows = Math.ceil(squares.y / tile.y);
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const dx = column * tile.x;
      const dy = row * tile.y;
      const visibleColumns = Math.min(tile.x * ppg, width - dx * ppg);
      const visibleRows = Math.min(tile.y * ppg, height - dy * ppg);
      overlays.push({
        input: await sharp(image)
          .extract({
            left: 0,
            top: 0,
            width: visibleColumns,
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
          .filter(
            (light) =>
              light.position.x < squares.x && light.position.y < squares.y,
          ),
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
      resolution: { ...json.resolution, map_size: squares },
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

async function waitUntilReady(): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${PORT}/api/config`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`The server did not start on port ${PORT}.`);
}

async function processResidentMb(pid: number): Promise<number> {
  try {
    const { stdout } = await run('ps', ['-o', 'rss=', '-p', String(pid)]);
    return Number(stdout.trim()) / 1024;
  } catch {
    return 0;
  }
}

async function startLocalServer(): Promise<BenchServer> {
  const server = spawn(process.execPath, ['src/server.ts'], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: String(PORT), NODE_ENV: 'production' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  const pid = server.pid!;
  const stop = async () => {
    if (server.exitCode !== null) {
      return;
    }
    const exited = new Promise((resolve) => server.once('exit', resolve));
    server.kill();
    await exited;
  };
  try {
    await waitUntilReady();
  } catch (error) {
    await stop();
    throw error;
  }

  let peak = await processResidentMb(pid);
  const sampler = setInterval(() => {
    void processResidentMb(pid).then((mb) => {
      peak = Math.max(peak, mb);
    });
  }, SAMPLE_MS);

  return {
    residentMb: () => processResidentMb(pid),
    peakMb: async () => Math.max(peak, await processResidentMb(pid)),
    stop: async () => {
      clearInterval(sampler);
      await stop();
    },
  };
}

async function containerStatusMb(field: 'VmRSS' | 'VmHWM'): Promise<number> {
  const { stdout } = await run('docker', [
    'exec',
    DOCKER_CONTAINER,
    'cat',
    '/proc/1/status',
  ]);
  const kb = new RegExp(`^${field}:\\s+(\\d+) kB`, 'm').exec(stdout)?.[1];
  if (!kb) {
    throw new Error(`${field} is missing from the container's /proc/1/status.`);
  }
  return Number(kb) / 1024;
}

async function removeContainer(): Promise<void> {
  await run('docker', ['rm', '-f', DOCKER_CONTAINER]).catch(() => undefined);
}

async function startDockerServer(): Promise<BenchServer> {
  await removeContainer();
  await run('docker', [
    'run',
    '-d',
    '--rm',
    '--name',
    DOCKER_CONTAINER,
    '-p',
    `${PORT}:3000`,
    '--memory',
    DOCKER_MEMORY,
    '--read-only',
    '-v',
    '/tmp',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges:true',
    ...DOCKER_ENV.flatMap((variable) => ['-e', variable]),
    DOCKER_IMAGE,
  ]);
  try {
    await waitUntilReady();
  } catch (error) {
    await removeContainer();
    throw error;
  }
  return {
    residentMb: () => containerStatusMb('VmRSS'),
    peakMb: () => containerStatusMb('VmHWM'),
    stop: removeContainer,
  };
}

async function describeTarget(): Promise<string> {
  const map = `maps ${MAPS.map(({ name, squares }) => `${name} ${squares.x}×${squares.y}`).join(', ')} squares`;
  if (TARGET === 'local') {
    return `Local: ${os.type()} ${os.arch()}, ${os.cpus()[0]?.model ?? 'unknown CPU'}, Node ${process.version}, ${map}. Peak memory: process RSS sampled every ${SAMPLE_MS} ms`;
  }
  const { stdout } = await run('docker', [
    'version',
    '--format',
    '{{.Server.Version}} {{.Server.Os}}/{{.Server.Arch}}',
  ]);
  return `Docker ${stdout.trim()}, image ${DOCKER_IMAGE} (jemalloc), memory limit ${DOCKER_MEMORY}${DOCKER_ENV.length > 0 ? `, env ${DOCKER_ENV.join(' ')}` : ''}, ${map}. Peak memory: process VmHWM`;
}

async function runCase(benchCase: BenchCase): Promise<BenchResult> {
  const server =
    TARGET === 'docker' ? await startDockerServer() : await startLocalServer();
  try {
    const baselineMb = await server.residentMb();

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
    const peakMb = await server.peakMb();

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
    await server.stop();
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
  if (TARGET === 'docker') {
    console.log('Building the Docker image...');
    await run('docker', ['compose', 'build'], { cwd: ROOT_DIR });
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
  const machine = await describeTarget();
  console.log(`\n${table}`);

  const existing = await fs
    .readFile(RESULTS_FILE, 'utf8')
    .catch(
      () =>
        '# Benchmark results\n\nAppended by `npm run bench` (`BENCH_TARGET=docker` for the Docker image).\n',
    );
  await fs.mkdir(path.dirname(RESULTS_FILE), { recursive: true });
  await fs.writeFile(
    RESULTS_FILE,
    `${existing}\n${heading}\n\n${machine}\n\n${table}\n`,
  );
  console.log(`\nAppended to ${path.relative(ROOT_DIR, RESULTS_FILE)}`);
}

await main();
