interface Squares {
  x: number;
  y: number;
}

interface MapImage {
  url: string;
  width: number;
  height: number;
  mediaId: string;
}

interface MapRecord {
  postId: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  tags: string[];
  squares?: Squares;
  patreonUrl: string;
  publishedAt: string;
  image: MapImage;
}

export type { MapImage, MapRecord, Squares };
