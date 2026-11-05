#!/bin/sh
set -eu
umask 077

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
CONTAINER="${CONTAINER:-dd-postgres}"

mkdir -p "$BACKUP_DIR"
target="$BACKUP_DIR/lair-$(date +%Y-%m-%d).dump"

docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB"' > "$target.tmp"
mv "$target.tmp" "$target"

find "$BACKUP_DIR" -name 'lair-*.dump' -mtime +"$KEEP_DAYS" -delete
