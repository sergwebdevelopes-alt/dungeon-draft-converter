import { Link } from 'react-router';
import type { CollectionLink } from '@contracts/gallery-api.ts';

interface TagFilterProps {
  collections: CollectionLink[];
  active: string | null;
}

const ALL_MAPS = '/maps';

const CHIP =
  'inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm font-bold whitespace-nowrap text-muted transition-colors hover:text-text aria-[current=page]:bg-text aria-[current=page]:text-bg';

function TagFilter({ collections, active }: TagFilterProps) {
  return (
    <nav
      aria-label="Filter maps"
      className="-mx-4 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:w-fit sm:flex-wrap sm:rounded-[26px] sm:bg-surface/70 sm:p-1 sm:ring-1 sm:ring-line"
    >
      <Link
        to={ALL_MAPS}
        className={CHIP}
        aria-current={active === null ? 'page' : undefined}
      >
        All maps
      </Link>
      {collections.map((collection) => (
        <Link
          key={collection.path}
          to={collection.path}
          className={CHIP}
          aria-current={collection.path === active ? 'page' : undefined}
        >
          {collection.name}
        </Link>
      ))}
    </nav>
  );
}

export { TagFilter };
