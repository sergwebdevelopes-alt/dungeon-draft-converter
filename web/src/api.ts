import type { FormatPreset, Variant } from '../../src/convert.ts';

interface Config {
  presets: FormatPreset[];
  variants: Variant[];
  maxUploadBytes: number;
  maxLogoBytes: number;
}

interface ConvertRequest {
  file: File;
  presets: string[];
  variants: Variant[];
  logo?: File;
}

async function readError(res: Response): Promise<string> {
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  return body.error ?? `Request failed (${res.status}).`;
}

async function fetchConfig(signal: AbortSignal): Promise<Config> {
  const res = await fetch('/api/config', { signal });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return (await res.json()) as Config;
}

async function convertFile(
  { file, logo, presets, variants }: ConvertRequest,
  signal: AbortSignal,
): Promise<Blob> {
  const params = new URLSearchParams({
    name: file.name,
    presets: presets.join(','),
    variants: variants.join(','),
  });

  const formData = new FormData();
  formData.append('map', file);
  if (logo) {
    formData.append('logo', logo);
  }

  const res = await fetch(`/api/convert?${params}`, {
    method: 'POST',
    body: formData,
    signal,
  });
  if (!res.ok) {
    throw new Error(await readError(res));
  }
  return res.blob();
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export { fetchConfig, convertFile, isAbortError };
export type { Config, FormatPreset, Variant };
