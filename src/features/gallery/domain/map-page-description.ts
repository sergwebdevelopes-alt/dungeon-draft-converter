import { mapCollection } from '../../../contracts/site-pages.ts';
import type { Squares } from '../../../contracts/gallery-api.ts';
import { mapSummary } from './map-summary.ts';

const SHORTEST_SUMMARY = 30;

interface DescribedMap {
  title: string;
  subtitle?: string;
  tags: string[];
  squares?: Squares;
  description?: string;
}

function mapLead(map: DescribedMap): string {
  const collection = mapCollection(map);
  const size = map.squares ? `${map.squares.x} × ${map.squares.y} ` : '';
  const kind = `${size}D&D battle map`;

  return `${map.title}, a ${kind}${collection ? ` for ${collection}` : ''}.`;
}

function mapPageDescription(map: DescribedMap, maxLength: number): string {
  const lead = mapLead(map);
  const room = maxLength - lead.length - 1;
  if (!map.description || room < SHORTEST_SUMMARY) {
    return lead;
  }

  const summary = mapSummary(map.description, room);

  return summary ? `${lead} ${summary}` : lead;
}

export { mapPageDescription };
export type { DescribedMap };
