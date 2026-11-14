interface Squares {
  x: number;
  y: number;
}

interface MapImageUrls {
  card: string;
  view: string;
  backdrop: string;
}

interface MapPicture {
  view: string;
  thumb: string;
  width: number;
  height: number;
}

interface MapEntry {
  slug: string;
  path: string;
  title: string;
  subtitle?: string;
  description?: string;
  tags: string[];
  squares?: Squares;
  width: number;
  height: number;
  patreonUrl: string;
  images: MapImageUrls;
  pictures?: MapPicture[];
}

interface CollectionLink {
  name: string;
  path: string;
}

interface MapsResponse {
  maps: MapEntry[];
  total: number;
  tags: string[];
  collections: CollectionLink[];
}

interface HighlightsResponse {
  maps: MapEntry[];
}

interface MapResponse {
  map: MapEntry;
}

export type {
  CollectionLink,
  HighlightsResponse,
  MapEntry,
  MapImageUrls,
  MapPicture,
  MapResponse,
  MapsResponse,
  Squares,
};
