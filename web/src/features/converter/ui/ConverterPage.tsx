import type { FormEvent } from 'react';
import {
  canSubmit,
  isConverting,
  selectedPresets,
} from '../model/converter-reducer.ts';
import { imageCount, presetLabel } from '../model/summary.ts';
import { Container } from '../../../shared/ui/Container.tsx';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import { useConverter } from '../useConverter.ts';
import { ConvertPanel } from './ConvertPanel.tsx';
import { LogoStep } from './LogoStep.tsx';
import { MapsStep } from './MapsStep.tsx';
import { OutputStep } from './OutputStep.tsx';

function ConverterPage() {
  const { state, dispatch, elapsedMs, submit, cancel, downloadAgain } =
    useConverter();
  const { config, maps, status } = state;
  const converting = isConverting(state);
  const formats = selectedPresets(state);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  return (
    <Container className="grid gap-6 pt-6 pb-36 lg:pb-8">
      <PageTitle title="Converter" />
      <header className="grid gap-1">
        <h1 className="font-display text-2xl font-bold tracking-wide sm:text-3xl">
          Dungeondraft Converter
        </h1>
        <p className="text-muted">
          Turn <code>.dd2vtt</code> exports into battle maps ready for your
          virtual tabletop or printer.
        </p>
      </header>

      <form
        className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px] lg:gap-5"
        onSubmit={handleSubmit}
      >
        <div className="grid min-w-0 content-start gap-4 md:grid-cols-2 lg:grid-cols-1 lg:gap-5">
          <MapsStep
            maps={maps}
            disabled={converting}
            onAdd={(files) => dispatch({ type: 'mapsAdded', files })}
            onMove={(from, to) => dispatch({ type: 'mapMoved', from, to })}
            onRemove={(index) => dispatch({ type: 'mapRemoved', index })}
          />

          <LogoStep
            logo={state.logo}
            limits={config?.logo ?? null}
            placement={state.placement}
            disabled={converting}
            onSelect={(file) => dispatch({ type: 'logoSelected', file })}
            onClear={() => dispatch({ type: 'logoCleared' })}
            onPlacementChange={(placement) =>
              dispatch({ type: 'placementChanged', placement })
            }
            onPlacementReset={() => dispatch({ type: 'placementReset' })}
          />
        </div>

        <OutputStep
          config={config}
          configError={state.configError}
          presets={state.presets}
          variants={state.variants}
          disabled={converting}
          onPresetToggle={(name) => dispatch({ type: 'presetToggled', name })}
          onVariantToggle={(variant) =>
            dispatch({ type: 'variantToggled', variant })
          }
        />

        <ConvertPanel
          status={status}
          elapsedMs={elapsedMs}
          canSubmit={canSubmit(state)}
          mapCount={maps.length}
          formats={formats.map(presetLabel)}
          imageCount={imageCount(
            maps.length,
            formats.length,
            state.variants.length,
          )}
          onCancel={cancel}
          onDownloadAgain={downloadAgain}
          onReset={() => dispatch({ type: 'reset' })}
        />
      </form>
    </Container>
  );
}

export { ConverterPage };
