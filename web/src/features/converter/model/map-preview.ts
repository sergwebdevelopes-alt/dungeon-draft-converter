interface MapPreview {
  image: Blob;
  columns: number;
  rows: number;
}

type PreviewState =
  | { status: 'empty' }
  | { status: 'hidden' }
  | { status: 'loading' }
  | { status: 'ready'; layers: string[]; columns: number; rows: number }
  | { status: 'error'; message: string };

type PreviewReply =
  { ok: true; preview: MapPreview } | { ok: false; message: string };

const UNREADABLE = 'This file could not be read as a Dungeondraft map.';

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null;
}

function decodeBase64(text: string): Uint8Array<ArrayBuffer> {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function imageType(bytes: Uint8Array): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    return 'image/png';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    return 'image/jpeg';
  }
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42) {
    return 'image/webp';
  }

  return '';
}

function gridSize(resolution: unknown): { columns: number; rows: number } {
  const size = isObject(resolution) ? resolution.map_size : null;
  const columns = isObject(size) ? Number(size.x) : NaN;
  const rows = isObject(size) ? Number(size.y) : NaN;
  if (!(columns > 0 && rows > 0)) {
    throw new Error(UNREADABLE);
  }

  return { columns: Math.round(columns), rows: Math.round(rows) };
}

async function readMapPreview(file: File): Promise<MapPreview> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(UNREADABLE);
  }
  if (!isObject(data) || typeof data.image !== 'string') {
    throw new Error(UNREADABLE);
  }

  const { columns, rows } = gridSize(data.resolution);

  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = decodeBase64(data.image);
  } catch {
    throw new Error(UNREADABLE);
  }

  return {
    image: new Blob([bytes], { type: imageType(bytes) }),
    columns,
    rows,
  };
}

async function previewReply(file: File): Promise<PreviewReply> {
  try {
    return { ok: true, preview: await readMapPreview(file) };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : UNREADABLE,
    };
  }
}

export { UNREADABLE, previewReply, readMapPreview };
export type { MapPreview, PreviewReply, PreviewState };
