import { useEffect, useState } from 'react';
import { readMapPreview, type MapPreview } from './model/map-preview.ts';

type PreviewState =
  | { status: 'empty' }
  | { status: 'loading' }
  | { status: 'ready'; url: string; columns: number; rows: number }
  | { status: 'error'; message: string };

type ReadPreview = (file: File) => Promise<MapPreview>;

function useMapPreview(
  file: File | null,
  read: ReadPreview = readMapPreview,
): PreviewState {
  const [state, setState] = useState<PreviewState>({ status: 'empty' });

  useEffect(() => {
    if (!file) {
      setState({ status: 'empty' });
      return;
    }

    let active = true;
    let url: string | null = null;
    setState({ status: 'loading' });

    async function load(source: File) {
      try {
        const preview = await read(source);
        if (!active) {
          return;
        }
        url = URL.createObjectURL(preview.image);
        setState({
          status: 'ready',
          url,
          columns: preview.columns,
          rows: preview.rows,
        });
      } catch (error) {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    void load(file);
    return () => {
      active = false;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, read]);

  return state;
}

export { useMapPreview };
export type { PreviewState };
