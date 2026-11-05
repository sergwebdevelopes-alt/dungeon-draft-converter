#!/bin/sh
set -eu
umask 077

REPO="sergwebdevelopes-alt/dungeon-draft-converter"
APP_DIR="${APP_DIR:-$HOME/apps/lair}"
FILES="compose.yml compose.prod.yml"

sha="${SSH_ORIGINAL_COMMAND:-${1:-}}"

case "$sha" in
  *[!0-9a-f]* | "")
    echo "Usage: deploy-app.sh <full commit sha>" >&2
    exit 2
    ;;
esac
if [ "${#sha}" -ne 40 ]; then
  echo "Give the full 40-character commit sha." >&2
  exit 2
fi

cd "$APP_DIR"

for file in $FILES; do
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$sha/$file" -o "$file.new"
done
for file in $FILES; do
  mv "$file.new" "$file"
done

{
  grep -v '^APP_TAG=' .env || true
  echo "APP_TAG=$sha"
} > .env.new
cat .env.new > .env
rm .env.new

docker compose pull
docker compose up -d --wait
docker image prune -af

echo "Deployed $sha"
