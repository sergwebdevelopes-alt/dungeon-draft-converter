interface Squares {
  x: number;
  y: number;
}

interface MapImageUrls {
  card: string;
  view: string;
  backdrop: string;
}

interface MapEntry {
  slug: string;
  title: string;
  subtitle?: string;
  description?: string;
  tags: string[];
  squares?: Squares;
  width: number;
  height: number;
  patreonUrl: string;
  images: MapImageUrls;
}

interface MapsResponse {
  maps: MapEntry[];
}

export type { MapEntry, MapImageUrls, MapsResponse, Squares };
