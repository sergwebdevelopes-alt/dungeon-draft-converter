import { useEffect, useRef, useState } from 'react';
import type { MapPreview, PreviewState } from './model/map-preview.ts';
import { readPreviewInWorker } from './preview-worker.ts';

type LevelPreview =
  | { status: 'loading' }
  | {
      status: 'ready';
      url: string;
      columns: number;
      rows: number;
      unlit: boolean;
    }
  | { status: 'error'; message: string };

type ReadPreview = (file: File) => Promise<MapPreview>;

function combine(
  files: File[],
  shown: File[],
  levels: Map<File, LevelPreview>,
): PreviewState {
  if (files.length === 0) {
    return { status: 'empty' };
  }
  if (shown.length === 0) {
    return { status: 'hidden' };
  }

  const main = levels.get(shown[0]);
  if (!main) {
    return { status: 'loading' };
  }
  if (main.status !== 'ready') {
    return main;
  }

  const ready = [...shown]
    .reverse()
    .map((file) => levels.get(file))
    .filter((level) => level?.status === 'ready');

  return {
    status: 'ready',
    layers: ready.map((level) => level.url),
    columns: main.columns,
    rows: main.rows,
    unlit: ready.some((level) => level.unlit),
  };
}

function revoke(level: LevelPreview | undefined) {
  if (level?.status === 'ready') {
    URL.revokeObjectURL(level.url);
  }
}

function useMapPreview(
  files: File[],
  shown: File[] = files,
  read: ReadPreview = readPreviewInWorker,
): PreviewState {
  const [levels, setLevels] = useState(() => new Map<File, LevelPreview>());
  const started = useRef(new Set<File>());

  useEffect(() => {
    for (const file of files) {
      if (started.current.has(file)) {
        continue;
      }
      started.current.add(file);
      setLevels((current) => new Map(current).set(file, { status: 'loading' }));

      void (async () => {
        let next: LevelPreview;
        try {
          const preview = await read(file);
          next = {
            status: 'ready',
            url: URL.createObjectURL(preview.image),
            columns: preview.columns,
            rows: preview.rows,
            unlit: preview.unlit,
          };
        } catch (error) {
          next = {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          };
        }

        if (!started.current.has(file)) {
          revoke(next);
          return;
        }
        setLevels((current) => new Map(current).set(file, next));
      })();
    }

    const kept = new Set(files);
    for (const file of [...started.current]) {
      if (!kept.has(file)) {
        started.current.delete(file);
      }
    }
    setLevels((current) => {
      const removed = [...current.keys()].filter((file) => !kept.has(file));
      if (removed.length === 0) {
        return current;
      }
      const next = new Map(current);
      for (const file of removed) {
        revoke(next.get(file));
        next.delete(file);
      }
      return next;
    });
  }, [files, read]);

  const latest = useRef(levels);
  latest.current = levels;
  useEffect(
    () => () => {
      started.current.clear();
      for (const level of latest.current.values()) {
        revoke(level);
      }
    },
    [],
  );

  return combine(files, shown, levels);
}

export { useMapPreview };
