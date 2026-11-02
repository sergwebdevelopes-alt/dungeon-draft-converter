import { useLocation, useNavigate, useSearchParams } from 'react-router';

const PARAM = 'map';

interface OpenedState {
  openedFromGallery?: boolean;
}

function useOpenMap() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const slug = params.get(PARAM);

  function paramsWith(next: string | null): URLSearchParams {
    const updated = new URLSearchParams(params);
    if (next) {
      updated.set(PARAM, next);
    } else {
      updated.delete(PARAM);
    }

    return updated;
  }

  function open(next: string) {
    setParams(paramsWith(next), { state: { openedFromGallery: true } });
  }

  function show(next: string) {
    setParams(paramsWith(next), {
      replace: true,
      state: location.state as unknown,
    });
  }

  function close() {
    const state = location.state as OpenedState | null;
    if (state?.openedFromGallery) {
      void navigate(-1);
      return;
    }

    setParams(paramsWith(null), { replace: true });
  }

  return { slug, open, show, close };
}

export { useOpenMap };
