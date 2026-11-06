import { http, type HttpClient } from '../../shared/http/index.ts';
import type { Config, ConvertRequest, QueuePosition } from './model/types.ts';

interface ConverterApi {
  fetchConfig(signal: AbortSignal): Promise<Config>;
  fetchQueuePosition(
    ticket: string,
    signal: AbortSignal,
  ): Promise<QueuePosition>;
  convert(
    request: ConvertRequest,
    signal: AbortSignal,
    onDownloading: () => void,
  ): Promise<Blob>;
}

function convertParams({
  ticket,
  maps,
  logo,
  presets,
  variants,
  foundry,
}: ConvertRequest): URLSearchParams {
  const params = new URLSearchParams({
    ticket,
    name: maps[0].name,
    presets: presets.join(','),
    variants: variants.join(','),
  });
  if (foundry) {
    params.set('foundry', 'true');
  }
  if (logo) {
    params.set('logoSize', String(logo.placement.size));
    params.set('logoMargin', String(logo.placement.margin));
  }

  return params;
}

function convertForm({ maps, logo }: ConvertRequest): FormData {
  const form = new FormData();
  for (const map of maps) {
    form.append('maps', map);
  }
  if (logo) {
    form.append('logo', logo.image);
  }

  return form;
}

function createConverterApi(client: HttpClient): ConverterApi {
  return {
    fetchConfig(signal) {
      return client.getJson<Config>('/api/config', { signal });
    },

    fetchQueuePosition(ticket, signal) {
      return client.getJson<QueuePosition>(`/api/queue/${ticket}`, {
        signal,
      });
    },

    convert(request, signal, onDownloading) {
      return client.postForm(
        `/api/convert?${convertParams(request)}`,
        convertForm(request),
        { signal, onResponse: onDownloading },
      );
    },
  };
}

const converterApi = createConverterApi(http);

export { converterApi, createConverterApi };
export type { ConverterApi };
