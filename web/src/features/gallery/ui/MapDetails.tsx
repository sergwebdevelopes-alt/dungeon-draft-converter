import { ButtonLink } from '@/shared/ui/Button.tsx';
import { Segmented } from '@/shared/ui/Segmented.tsx';
import { squaresLabel, type MapEntry } from '../model/catalog.ts';
import { MapDescription } from './MapDescription.tsx';

interface MapDetailsProps {
  map: MapEntry;
  titleId: string;
  canGrid: boolean;
  showGrid: boolean;
  onShowGrid: (show: boolean) => void;
}

const GRID_OPTIONS = [
  { value: 'without', label: 'Without grid' },
  { value: 'with', label: 'With grid' },
] as const satisfies { value: string; label: string }[];

function MapDetails({
  map,
  titleId,
  canGrid,
  showGrid,
  onShowGrid,
}: MapDetailsProps) {
  return (
    <div className="grid min-h-0 content-start gap-4 overflow-y-auto border-t border-line p-4 sm:p-6 lg:gap-5 lg:border-t-0 lg:border-l">
      <div className="grid content-start gap-3">
        <div className="grid content-start gap-2">
          <h2
            id={titleId}
            className="font-display text-xl leading-tight font-bold tracking-wide sm:text-2xl lg:text-xl"
          >
            {map.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <ul className="contents" aria-label="Tags">
              {map.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-line px-3 py-1 text-xs font-bold tracking-wide text-muted uppercase"
                >
                  {tag}
                </li>
              ))}
            </ul>
            {map.squares && (
              <p className="text-muted">{squaresLabel(map.squares)}</p>
            )}
          </div>
        </div>

        {canGrid && (
          <div className="hidden lg:block">
            <Segmented
              label="Grid"
              size="small"
              options={GRID_OPTIONS}
              value={showGrid ? 'with' : 'without'}
              onChange={(choice) => onShowGrid(choice === 'with')}
            />
          </div>
        )}

        <ButtonLink href={map.patreonUrl}>Get it on Patreon</ButtonLink>
      </div>

      {map.description && <MapDescription html={map.description} />}
    </div>
  );
}

export { MapDetails };
