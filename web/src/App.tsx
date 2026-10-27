import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  convertFile,
  fetchConfig,
  isAbortError,
  type Config,
  type LogoPlacement,
  type Variant,
} from './api.ts';
import { DropZone } from './DropZone.tsx';
import { formatBytes, formatDuration } from './format.ts';
import {
  clampPlacement,
  defaultPlacement,
  isDefaultPlacement,
  LogoPlacementPanel,
} from './LogoPlacement.tsx';
import { loadSettings, saveSettings } from './settings.ts';
import { Option } from './Option.tsx';
import { OptionSkeleton } from './OptionSkeleton.tsx';

type Status =
  | { kind: 'idle' }
  | { kind: 'converting'; startedAt: number }
  | { kind: 'done'; url: string; fileName: string }
  | { kind: 'error'; message: string };

const PRESET_HINTS: Record<string, string> = {
  JPG_70: 'Small file, loads fast',
  JPG_140: 'Crisp on screen',
  JPG_300: 'Print, 1 inch per square',
  WEBP_140: 'Crisp, smallest file',
};

const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const VARIANT_LABELS: Record<Variant, { title: string; hint: string }> = {
  NoGrid: { title: 'Without grid', hint: 'Clean map for your VTT' },
  Grid: { title: 'With grid', hint: 'Dashed grid baked in' },
};

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function download(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
}

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [placement, setPlacement] = useState<LogoPlacement | null>(null);
  const [presets, setPresets] = useState<string[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchConfig(controller.signal)
      .then((loaded) => {
        setConfig(loaded);
        const saved = loadSettings(loaded);
        setPresets(saved.presets);
        setVariants(saved.variants);
        setPlacement(saved.placement);
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setConfigError('Could not load settings. Reload the page to retry.');
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (placement) {
      saveSettings({ presets, variants, placement });
    }
  }, [presets, variants, placement]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (status.kind !== 'converting') {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [status.kind]);

  useEffect(() => {
    if (status.kind !== 'done') {
      return;
    }
    return () => URL.revokeObjectURL(status.url);
  }, [status]);

  const converting = status.kind === 'converting';
  const canSubmit =
    !!config &&
    !!file &&
    presets.length > 0 &&
    variants.length > 0 &&
    !converting;

  function selectFile(selected: File) {
    if (!selected.name.toLowerCase().endsWith('.dd2vtt')) {
      setStatus({ kind: 'error', message: 'Please choose a .dd2vtt file.' });
      return;
    }
    if (config && selected.size > config.maxUploadBytes) {
      setStatus({
        kind: 'error',
        message: `This file is too large (max ${formatBytes(config.maxUploadBytes)}).`,
      });
      return;
    }
    setFile(selected);
    setStatus({ kind: 'idle' });
  }

  function selectLogo(selected: File) {
    if (!LOGO_TYPES.includes(selected.type)) {
      setStatus({
        kind: 'error',
        message: 'Logo must be a PNG, JPG or WebP image.',
      });
      return;
    }
    if (config && selected.size > config.maxLogoBytes) {
      setStatus({
        kind: 'error',
        message: `This logo is too large (max ${formatBytes(config.maxLogoBytes)}).`,
      });
      return;
    }
    setLogo(selected);
    clearResult();
  }

  function clearResult() {
    setStatus((current) =>
      current.kind === 'done' || current.kind === 'error'
        ? { kind: 'idle' }
        : current,
    );
  }

  function changePlacement(value: LogoPlacement) {
    setPlacement(value);
    clearResult();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file || !config || !canSubmit) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const startedAt = Date.now();
    setNow(startedAt);
    setStatus({ kind: 'converting', startedAt });

    try {
      const logoOptions =
        logo && placement
          ? { image: logo, placement: clampPlacement(placement, config.logo) }
          : undefined;
      const blob = await convertFile(
        { file, logo: logoOptions, presets, variants },
        controller.signal,
      );
      const url = URL.createObjectURL(blob);
      const fileName = `${file.name.replace(/\.dd2vtt$/i, '')}.zip`;
      setStatus({ kind: 'done', url, fileName });
      download(url, fileName);
    } catch (error) {
      if (isAbortError(error)) {
        setStatus({ kind: 'idle' });
        return;
      }
      setStatus({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function reset() {
    setFile(null);
    setStatus({ kind: 'idle' });
  }

  return (
    <div className="page">
      <header className="hero">
        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 2 4 6v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V6l-8-4Z" />
            <path d="M9 12h6M12 9v6" />
          </svg>
        </div>
        <h1>Dungeondraft Converter</h1>
        <p>
          Turn <code>.dd2vtt</code> exports into battle maps ready for your
          virtual tabletop or printer.
        </p>
      </header>

      <form
        className={`card${logo ? ' has-placement' : ''}`}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <section className="step step-file">
          <h2>
            <span className="step-number">1</span> Map file
          </h2>
          <DropZone
            file={file}
            disabled={converting}
            onFile={selectFile}
            accept=".dd2vtt"
            title="Drop your .dd2vtt file here"
          />
        </section>

        <section className="step step-logo">
          <h2>
            <span className="step-number">2</span> Logo
            <span className="muted optional">optional</span>
          </h2>
          <DropZone
            file={logo}
            disabled={converting}
            onFile={selectLogo}
            onClear={() => {
              setLogo(null);
              clearResult();
            }}
            accept={LOGO_TYPES.join(',')}
            title="Add your logo"
            hint="PNG, JPG or WebP · placed bottom-right"
            compact
            preview
          />
        </section>

        <section className="step step-formats">
          <h2>
            <span className="step-number">3</span> Formats
          </h2>
          {configError ? (
            <p className="alert">{configError}</p>
          ) : (
            <div className="options">
              {config
                ? config.presets.map((preset) => (
                    <Option
                      key={preset.name}
                      checked={presets.includes(preset.name)}
                      disabled={converting}
                      title={`${preset.format.toUpperCase()} · ${preset.ppi} px`}
                      hint={
                        PRESET_HINTS[preset.name] ??
                        `${preset.ppi} px per square`
                      }
                      onChange={() => {
                        setPresets((list) => toggle(list, preset.name));
                        clearResult();
                      }}
                    />
                  ))
                : Array.from({ length: 4 }, (_, i) => (
                    <OptionSkeleton key={i} />
                  ))}
            </div>
          )}
        </section>

        <section className="step step-grid">
          <h2>
            <span className="step-number">4</span> Grid overlay
          </h2>
          <div className="options">
            {config
              ? config.variants.map((variant) => (
                  <Option
                    key={variant}
                    checked={variants.includes(variant)}
                    disabled={converting}
                    title={VARIANT_LABELS[variant].title}
                    hint={VARIANT_LABELS[variant].hint}
                    onChange={() => {
                      setVariants((list) => toggle(list, variant));
                      clearResult();
                    }}
                  />
                ))
              : Array.from({ length: 2 }, (_, i) => <OptionSkeleton key={i} />)}
          </div>
        </section>

        {logo && config && placement && (
          <section className="step step-placement">
            <h2>
              <span className="step-number">5</span> Logo placement
              <button
                type="button"
                className="link-button placement-reset"
                disabled={
                  converting || isDefaultPlacement(placement, config.logo)
                }
                onClick={() => changePlacement(defaultPlacement(config.logo))}
              >
                Reset
              </button>
            </h2>
            <LogoPlacementPanel
              logo={logo}
              limits={config.logo}
              value={placement}
              disabled={converting}
              onChange={changePlacement}
            />
          </section>
        )}

        <footer className="actions">
          {status.kind === 'error' && (
            <p className="alert" role="alert">
              {status.message}
            </p>
          )}

          {status.kind === 'converting' && (
            <div className="progress" role="status">
              <div className="progress-bar" />
              <div className="progress-row">
                <span>Uploading and converting…</span>
                <span className="muted">
                  {formatDuration(now - status.startedAt)}
                </span>
              </div>
            </div>
          )}

          {status.kind === 'done' ? (
            <div className="success" role="status">
              <p>
                <strong>{status.fileName}</strong> is ready.
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="button primary"
                  onClick={() => download(status.url, status.fileName)}
                >
                  Download again
                </button>
                <button type="button" className="button" onClick={reset}>
                  Convert another map
                </button>
              </div>
            </div>
          ) : converting ? (
            <button
              key="cancel"
              type="button"
              className="button"
              onClick={() => abortRef.current?.abort()}
            >
              Cancel
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              className="button primary"
              disabled={!canSubmit}
            >
              Convert &amp; download
            </button>
          )}
        </footer>
      </form>

      <p className="footnote">
        Maps are processed in memory and never stored on the server.
      </p>
    </div>
  );
}

export { App };
