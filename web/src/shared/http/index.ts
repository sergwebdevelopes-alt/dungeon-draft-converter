import { createFetchHttpClient } from './fetch-http-client.ts';
import type { HttpClient } from './http-client.ts';

const http: HttpClient = createFetchHttpClient();

export { http };
export { HttpError, isAbortError } from './http-client.ts';
export type {
  HttpClient,
  PostFormOptions,
  RequestOptions,
} from './http-client.ts';
