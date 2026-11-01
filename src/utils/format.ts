function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatDuration(ms: number): string {
  const [value, unit] =
    ms >= 60_000 ? [ms / 60_000, 'minute'] : [ms / 1000, 'second'];
  const rounded = roundToTenth(value);

  return `${rounded} ${unit}${rounded === 1 ? '' : 's'}`;
}

function formatMegabytes(bytes: number): string {
  return `${roundToTenth(bytes / 1024 / 1024)} MB`;
}

function formatMegapixels(pixels: number): string {
  return `${roundToTenth(pixels / 1_000_000)} megapixels`;
}

export { formatDuration, formatMegabytes, formatMegapixels };
