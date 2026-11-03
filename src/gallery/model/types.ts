import type { PostImage } from '../patreon/post-details.ts';

interface GalleryRules {
  tag: string;
  genericTags: string[];
}

interface Squares {
  x: number;
  y: number;
}

interface MapRecord {
  postId: string;
  slug: string;
  title: string;
  subtitle?: string;
  tags: string[];
  squares?: Squares;
  patreonUrl: string;
  publishedAt: string;
  image: PostImage;
}

export type { GalleryRules, MapRecord, Squares };
