import { useEffect, useReducer, useRef } from 'react';
import { isAbortError } from '../../shared/http/index.ts';
import { saveFile } from '../../shared/lib/save-file.ts';
import { storage, type KeyValueStore } from '../../shared/storage/index.ts';
import { converterApi, type ConverterApi } from './api.ts';
import { toConvertRequest } from './model/convert-request.ts';
import {
  canSubmit,
  converterReducer,
  initialState,
  type ConverterAction,
  type ConverterState,
} from './model/converter-reducer.ts';
import { loadSettings, saveSettings } from './model/settings.ts';
import { zipName } from './model/summary.ts';
import { newTicket } from './model/ticket.ts';

const QUEUE_POLL_MS = 2000;

function useConverter(
  api: ConverterApi = converterApi,
  store: KeyValueStore = storage,
) {
  const [state, dispatch] = useReducer(converterReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);
  const { status, presets, variants, placement } = state;

  useLoadConfig(api, store, dispatch);
  useSaveSettings(store, presets, variants, placement);
  useAbortOnUnmount(abortRef);
  useQueuePolling(api, state, dispatch);
  useRevokeResultUrl(status);

  async function submit() {
    if (!canSubmit(state)) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const ticket = newTicket();
    dispatch({ type: 'submitted', ticket, startedAt: Date.now() });

    try {
      const blob = await api.convert(
        toConvertRequest(state, ticket),
        controller.signal,
        () =>
          dispatch({
            type: 'progressed',
            ticket,
            progress: { state: 'downloading' },
          }),
      );
      const url = URL.createObjectURL(blob);
      const fileName = zipName(state.maps);
      dispatch({ type: 'succeeded', url, fileName });
      saveFile(url, fileName);
    } catch (error) {
      if (isAbortError(error)) {
        dispatch({ type: 'cancelled' });
        return;
      }
      dispatch({
        type: 'failed',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function cancel() {
    abortRef.current?.abort();
  }

  function downloadAgain() {
    if (status.kind === 'done') {
      saveFile(status.url, status.fileName);
    }
  }

  return { state, dispatch, submit, cancel, downloadAgain };
}

function useLoadConfig(
  api: ConverterApi,
  store: KeyValueStore,
  dispatch: (action: ConverterAction) => void,
) {
  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const config = await api.fetchConfig(controller.signal);
        dispatch({
          type: 'configLoaded',
          config,
          settings: loadSettings(config, store),
        });
      } catch (error) {
        if (!isAbortError(error)) {
          dispatch({ type: 'configFailed' });
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [api, store, dispatch]);
}

function useSaveSettings(
  store: KeyValueStore,
  presets: string[],
  variants: ConverterState['variants'],
  placement: ConverterState['placement'],
) {
  useEffect(() => {
    if (placement) {
      saveSettings({ presets, variants, placement }, store);
    }
  }, [store, presets, variants, placement]);
}

function useAbortOnUnmount(abortRef: { current: AbortController | null }) {
  useEffect(() => () => abortRef.current?.abort(), [abortRef]);
}

function useQueuePolling(
  api: ConverterApi,
  state: ConverterState,
  dispatch: (action: ConverterAction) => void,
) {
  const { status } = state;
  const ticket =
    status.kind === 'converting' && status.progress.state !== 'downloading'
      ? status.ticket
      : null;

  useEffect(() => {
    if (!ticket) {
      return;
    }
    const controller = new AbortController();

    async function poll(pollTicket: string) {
      try {
        const position = await api.fetchQueuePosition(
          pollTicket,
          controller.signal,
        );
        if (position.state !== 'unknown') {
          dispatch({
            type: 'progressed',
            ticket: pollTicket,
            progress: position,
          });
        }
      } catch {
        return;
      }
    }

    const timer = setInterval(() => void poll(ticket), QUEUE_POLL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [api, ticket, dispatch]);
}

function useRevokeResultUrl(status: ConverterState['status']) {
  useEffect(() => {
    if (status.kind !== 'done') {
      return;
    }
    return () => URL.revokeObjectURL(status.url);
  }, [status]);
}

export { useConverter };
