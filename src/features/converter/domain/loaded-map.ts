type MapImage = string;

interface LoadedMap {
  fileNameWithExt: string;
  fileNameWithoutExt: string;
  image: MapImage;
  pixelsPerGrid?: number;
  metadata: Record<string, unknown>;
}

export type { LoadedMap, MapImage };
