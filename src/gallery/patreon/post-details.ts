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

interface ListOptions {
  stopWhen?: (details: PostDetails) => boolean;
  signal?: AbortSignal;
}

interface PostDetailsSource {
  listDetails(options?: ListOptions): Promise<PostDetails[]>;
  details(postId: string, signal?: AbortSignal): Promise<PostDetails | null>;
}

export type { ListOptions, PostDetails, PostDetailsSource, PostImage };
