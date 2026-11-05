interface PatreonPost {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  isPublic: boolean;
}

interface PostImage {
  url: string;
  width: number;
  height: number;
  mediaId: string;
  isMain: boolean;
  fileName?: string;
}

interface PostDetails {
  postId: string;
  publishedAt: string;
  collections: string[];
  images: PostImage[];
}

export type { PatreonPost, PostDetails, PostImage };
