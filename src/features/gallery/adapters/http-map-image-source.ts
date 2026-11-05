import type { HttpClient } from '../../../infrastructure/http-client/http-client.ts';
import type { FetchMapImage } from '../ports/map-image-source.ts';

function createHttpMapImageSource(http: HttpClient): FetchMapImage {
  return (url, signal) => http.getBytes(url, { signal });
}

export { createHttpMapImageSource };
