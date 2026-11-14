import { useEffect, type FormEvent } from 'react';
import { usePreventPageDrop } from '@/shared/hooks/useFileDrop.ts';
import { Alert } from '@/shared/ui/Alert.tsx';
import {
  canSubmit,
  isConverting,
  selectedPresets,
  tooLargePresets,
  visibleMaps,
} from '../model/converter-reducer.ts';
import { gridChoice, variantsFor } from '../model/grid-choice.ts';
import { imageCount } from '../model/summary.ts';
import { useConverter } from '../hooks/useConverter.ts';
import { useMapPreview } from '../hooks/useMapPreview.ts';
import { ConvertPanel } from './ConvertPanel.tsx';
import { DropZone } from './DropZone.tsx';
import { FormatChips } from './FormatChips.tsx';
import { GridSwitch } from './GridSwitch.tsx';
import { LevelList } from './LevelList.tsx';
import { LogoControls } from './LogoControls.tsx';
import { MapStage } from './MapStage.tsx';

function ConverterForm() {
  const { state, dispatch, submit, cancel, downloadAgain } = useConverter();
  const { config, maps, status } = state;
  const converting = isConverting(state);
  const formats = selectedPresets(state);
  const shown = visibleMaps(state);
  const preview = useMapPreview(maps, shown);
  const columns = preview.status === 'ready' ? preview.columns : null;
  const rows = preview.status === 'ready' ? preview.rows : null;
  usePreventPageDrop();

  useEffect(() => {
    dispatch({
      type: 'mapSizeKnown',
      size: columns && rows ? { columns, rows } : null,
    });
  }, [dispatch, columns, rows]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit();
  }

  function addMaps(files: File[]) {
    dispatch({ type: 'mapsAdded', files });
  }

  return (
    <form
      className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]"
      onSubmit={handleSubmit}
    >
      <div className="grid min-w-0 content-start gap-3">
        <div className="h-[min(62svh,560px)] lg:h-[clamp(460px,calc(100svh-13rem),820px)]">
          <MapStage
            preview={preview}
            grid={gridChoice(state.variants)}
            logo={state.logo}
            placement={state.placement}
            busy={converting}
            disabled={converting}
            onAddMaps={addMaps}
          />
        </div>

        {maps.length > 0 && (
          <div className="grid gap-2">
            <DropZone
              disabled={converting}
              onFiles={addMaps}
              accept=".dd2vtt"
              title="Add more levels"
              compact
            />
            <LevelList
              levels={maps}
              hidden={state.hidden}
              disabled={converting}
              onMove={(from, to) => dispatch({ type: 'mapMoved', from, to })}
              onRemove={(index) => dispatch({ type: 'mapRemoved', index })}
              onToggle={(index) => dispatch({ type: 'levelToggled', index })}
            />
          </div>
        )}
      </div>

      <div className="grid content-start gap-5 lg:sticky lg:top-20 lg:self-start lg:rounded-3xl lg:bg-surface/80 lg:p-6 lg:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.6)] lg:ring-1 lg:ring-line lg:backdrop-blur-xl">
        {state.configError ? (
          <Alert tone="error" className="text-sm">
            {state.configError}
          </Alert>
        ) : (
          <>
            <FormatChips
              presets={config?.presets ?? null}
              selected={state.presets}
              tooLarge={tooLargePresets(state)}
              foundry={state.foundry}
              disabled={converting}
              onToggle={(name) => dispatch({ type: 'presetToggled', name })}
              onToggleFoundry={() => dispatch({ type: 'foundryToggled' })}
            />
            <GridSwitch
              value={gridChoice(state.variants)}
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
          canSubmit={canSubmit(state)}
          mapCount={shown.length}
          foundry={state.foundry}
          imageCount={imageCount(
            shown.length,
            formats.length,
            state.variants.length,
          )}
          onCancel={cancel}
          onDownloadAgain={downloadAgain}
          onReset={() => dispatch({ type: 'reset' })}
        />
      </div>
    </form>
  );
}

export { ConverterForm };
