import type {
  FormatPreset,
  LOGO_LIMITS,
  LogoSetting,
  Variant,
} from '../../src/convert.ts';

type LogoLimits = typeof LOGO_LIMITS;

type LogoPlacement = Record<LogoSetting, number>;

interface Config {
  presets: FormatPreset[];
  variants: Variant[];
  maxUploadBytes: number;
  maxTotalUploadBytes: number;
  maxLevels: number;
  maxLogoBytes: number;
  logo: LogoLimits;
}

interface ConvertRequest {
  maps: File[];
  presets: string[];
  variants: Variant[];
  logo?: { image: File; placement: LogoPlacement };
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
  { maps, logo, presets, variants }: ConvertRequest,
  signal: AbortSignal,
): Promise<Blob> {
  const params = new URLSearchParams({
    name: maps[0].name,
    presets: presets.join(','),
    variants: variants.join(','),
  });
  if (logo) {
    params.set('logoSize', String(logo.placement.size));
    params.set('logoMargin', String(logo.placement.margin));
  }

  const formData = new FormData();
  for (const map of maps) {
    formData.append('maps', map);
  }
  if (logo) {
    formData.append('logo', logo.image);
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
export type { Config, FormatPreset, LogoLimits, LogoPlacement, Variant };
