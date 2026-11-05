interface PatreonPost {
  id: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  isPublic: boolean;
}

interface PatreonApi {
  listPosts(signal?: AbortSignal): Promise<PatreonPost[]>;
}

export type { PatreonApi, PatreonPost };
