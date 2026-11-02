import { useEffect, useRef, useState } from 'react';
import type { MapPreview, PreviewState } from './model/map-preview.ts';
import { readPreviewInWorker } from './preview-worker.ts';

type LevelPreview =
  | { status: 'loading' }
  | { status: 'ready'; url: string; columns: number; rows: number }
  | { status: 'error'; message: string };

type ReadPreview = (file: File) => Promise<MapPreview>;

function combine(files: File[], levels: Map<File, LevelPreview>): PreviewState {
  const main = files.length > 0 ? levels.get(files[0]) : undefined;
  if (!main) {
    return files.length === 0 ? { status: 'empty' } : { status: 'loading' };
  }
  if (main.status !== 'ready') {
    return main;
  }

  const layers = [...files]
    .reverse()
    .map((file) => levels.get(file))
    .flatMap((level) => (level?.status === 'ready' ? [level.url] : []));

  return { status: 'ready', layers, columns: main.columns, rows: main.rows };
}

function revoke(level: LevelPreview | undefined) {
  if (level?.status === 'ready') {
    URL.revokeObjectURL(level.url);
  }
}

function useMapPreview(
  files: File[],
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

  return combine(files, levels);
}

export { useMapPreview };
