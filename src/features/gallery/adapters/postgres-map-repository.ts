import type {
  Database,
  Queryable,
} from '../../../infrastructure/database/database.ts';
import type {
  MapRepository,
  StoredMap,
  SyncCounts,
} from '../ports/map-repository.ts';
import type { MapRecord } from '../domain/map-record.ts';

interface MapRow {
  post_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  tags: string[];
  squares_x: number | null;
  squares_y: number | null;
  patreon_url: string;
  published_at: Date;
  image_url: string;
  image_width: number;
  image_height: number;
  image_media_id: string;
  checked_at: Date;
}

function changedSql(fields: string[]): string {
  const before = fields.map((field) => `maps.${field}`);
  const after = fields.map((field) => `EXCLUDED.${field}`);

  return `(${before.join(', ')}) IS DISTINCT FROM (${after.join(', ')})`;
}

function upsertSql(columns: string[]): string {
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const fields = columns.filter((column) => column !== 'post_id');
  const updates = fields.map((field) => `${field} = EXCLUDED.${field}`);
  const updatedAt = `updated_at = CASE WHEN ${changedSql(fields)} THEN now() ELSE maps.updated_at END`;

  return `INSERT INTO maps (${columns.join(', ')}, checked_at, updated_at)
    VALUES (${placeholders.join(', ')}, now(), now())
    ON CONFLICT (post_id) DO UPDATE SET
      ${[...updates, 'checked_at = now()', updatedAt].join(',\n      ')}
    RETURNING updated_at = now() AS changed`;
}

async function storedIds(tx: Queryable): Promise<Set<string>> {
  const rows = await tx.query<{ post_id: string }>('SELECT post_id FROM maps');

  return new Set(rows.map((row) => row.post_id));
}

async function saveMap(tx: Queryable, map: MapRecord): Promise<boolean> {
  const row = toRow(map);
  const [{ changed }] = await tx.query<{ changed: boolean }>(
    upsertSql(Object.keys(row)),
    Object.values(row),
  );

  return changed;
}

async function removeOthers(tx: Queryable, maps: MapRecord[]): Promise<number> {
  const removed = await tx.query(
    'DELETE FROM maps WHERE NOT (post_id = ANY($1)) RETURNING post_id',
    [maps.map((map) => map.postId)],
  );

  return removed.length;
}

function toStoredMap(row: MapRow): StoredMap {
  return {
    postId: row.post_id,
    slug: row.slug,
    title: row.title,
    ...(row.subtitle ? { subtitle: row.subtitle } : {}),
    description: row.description,
    tags: row.tags,
    ...(row.squares_x && row.squares_y
      ? { squares: { x: row.squares_x, y: row.squares_y } }
      : {}),
    patreonUrl: row.patreon_url,
    publishedAt: row.published_at.toISOString(),
    image: {
      url: row.image_url,
      width: row.image_width,
      height: row.image_height,
      mediaId: row.image_media_id,
    },
    checkedAt: row.checked_at.toISOString(),
  };
}

function toRow(map: MapRecord): Record<string, unknown> {
  return {
    post_id: map.postId,
    slug: map.slug,
    title: map.title,
    subtitle: map.subtitle ?? null,
    description: map.description,
    tags: map.tags,
    squares_x: map.squares?.x ?? null,
    squares_y: map.squares?.y ?? null,
    patreon_url: map.patreonUrl,
    published_at: map.publishedAt,
    image_url: map.image.url,
    image_width: map.image.width,
    image_height: map.image.height,
    image_media_id: map.image.mediaId,
  };
}

function createPostgresMapRepository(db: Database): MapRepository {
  return {
    async listMaps() {
      const rows = await db.query<MapRow>(
        'SELECT * FROM maps ORDER BY published_at DESC, post_id',
      );
      return rows.map(toStoredMap);
    },

    async replaceMaps(maps) {
      return db.transaction(async (tx): Promise<SyncCounts> => {
        const before = await storedIds(tx);
        const counts = { added: 0, updated: 0, removed: 0 };

        for (const map of maps) {
          const changed = await saveMap(tx, map);
          if (!before.has(map.postId)) {
            counts.added += 1;
          } else if (changed) {
            counts.updated += 1;
          }
        }

        counts.removed = await removeOthers(tx, maps);
        return counts;
      });
    },
  };
}

export { createPostgresMapRepository };
