#!/usr/bin/env bash
set -e

stamp=$(date +%Y%m%d-%H%M%S)
file="omniconnect-${stamp}.dump"

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL must be set" >&2
  exit 1
fi
if [ -z "$BACKUP_BUCKET" ]; then
  echo "BACKUP_BUCKET must be set" >&2
  exit 1
fi

# Strip ?schema=... query params that pg_dump does not understand.
db_url="${DATABASE_URL%%\?*}"

# Prefer the local Postgres container's pg_dump so the client version always matches the server.
if command -v docker &>/dev/null && docker ps --format '{{.Names}}' | grep -qx omniconnect-postgres; then
  echo "Creating backup via omniconnect-postgres container: $file"
  docker exec omniconnect-postgres pg_dump -U postgres -Fc omniconnect > "$file"
else
  echo "Creating backup with local pg_dump: $file"
  pg_dump "${db_url}" -Fc -f "$file"
fi

prefix="${BACKUP_PREFIX:-omniconnect-backups}"
echo "Uploading to s3://${BACKUP_BUCKET}/${prefix}/${file}"
aws s3 cp "$file" "s3://${BACKUP_BUCKET}/${prefix}/${file}"

echo "Backup uploaded to s3://${BACKUP_BUCKET}/${prefix}/${file}"
