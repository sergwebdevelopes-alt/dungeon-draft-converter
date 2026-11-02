import type { FormEvent } from 'react';
import { Container } from '../../../shared/ui/Container.tsx';
import { PageTitle } from '../../../shared/ui/PageTitle.tsx';
import {
  canSubmit,
  isConverting,
  selectedPresets,
} from '../model/converter-reducer.ts';
import { choiceOf, variantsFor } from '../model/grid-choice.ts';
import { imageCount } from '../model/summary.ts';
import { useConverter } from '../useConverter.ts';
import { useMapPreview } from '../useMapPreview.ts';
import { ConvertPanel } from './ConvertPanel.tsx';
import { DropZone } from './DropZone.tsx';
import { FormatChips } from './FormatChips.tsx';
import { GridSwitch } from './GridSwitch.tsx';
import { LevelList } from './LevelList.tsx';
import { LogoControls } from './LogoControls.tsx';
import { MapStage } from './MapStage.tsx';

function ConverterPage() {
  const { state, dispatch, elapsedMs, submit, cancel, downloadAgain } =
    useConverter();
  const { config, maps, status } = state;
  const converting = isConverting(state);
  const formats = selectedPresets(state);
  const preview = useMapPreview(maps);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function addMaps(files: File[]) {
    dispatch({ type: 'mapsAdded', files });
  }

  return (
    <Container className="grid gap-5 pt-6 pb-40 sm:pt-8 lg:pb-12">
      <PageTitle title="Converter" />
      <header className="grid gap-1">
        <h1 className="font-display text-3xl font-bold tracking-wide sm:text-4xl">
          Dungeondraft Converter
        </h1>
        <p className="text-muted">
          Turn <code>.dd2vtt</code> exports into images for your virtual
          tabletop or printer.
        </p>
      </header>

      <form
        className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]"
        onSubmit={handleSubmit}
      >
        <div className="grid min-w-0 content-start gap-3">
          <div className="h-[min(62svh,560px)] lg:h-[clamp(460px,calc(100svh-13rem),820px)]">
            <MapStage
              preview={preview}
              grid={choiceOf(state.variants)}
              logo={state.logo}
              placement={state.placement}
              busy={converting}
              disabled={converting}
              onAddMaps={addMaps}
            />
          </div>

          {maps.length > 0 && (
            <div className="grid gap-2">
              <LevelList
                levels={maps}
                disabled={converting}
                onMove={(from, to) => dispatch({ type: 'mapMoved', from, to })}
                onRemove={(index) => dispatch({ type: 'mapRemoved', index })}
              />
              <DropZone
                file={null}
                disabled={converting}
                onFiles={addMaps}
                accept=".dd2vtt"
                title="Add more levels"
                hint=""
                compact
                multiple
              />
            </div>
          )}
        </div>

        <div className="grid content-start gap-5 lg:sticky lg:top-20 lg:self-start lg:rounded-3xl lg:bg-surface/80 lg:p-6 lg:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] lg:ring-1 lg:ring-line lg:backdrop-blur-xl">
          {state.configError ? (
            <p
              role="alert"
              className="rounded-lg border-l-[3px] border-danger bg-danger-soft px-3 py-2 text-sm"
            >
              {state.configError}
            </p>
          ) : (
            <>
              <FormatChips
                presets={config?.presets ?? null}
                selected={state.presets}
                disabled={converting}
                onToggle={(name) => dispatch({ type: 'presetToggled', name })}
              />
              <GridSwitch
                value={choiceOf(state.variants)}
                disabled={converting || !config}
                onChange={(choice) =>
                  dispatch({
                    type: 'variantsChosen',
                    variants: variantsFor(choice),
                  })
                }
              />
              <LogoControls
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
            </>
          )}

          <ConvertPanel
            status={status}
            elapsedMs={elapsedMs}
            canSubmit={canSubmit(state)}
            mapCount={maps.length}
            imageCount={imageCount(
              maps.length,
              formats.length,
              state.variants.length,
            )}
            onCancel={cancel}
            onDownloadAgain={downloadAgain}
            onReset={() => dispatch({ type: 'reset' })}
          />
        </div>
      </form>
    </Container>
  );
}

export { ConverterPage };
