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

echo "Creating backup: $file"
pg_dump "${db_url}" -Fc -f "$file"

prefix="${BACKUP_PREFIX:-omniconnect-backups}"
echo "Uploading to s3://${BACKUP_BUCKET}/${prefix}/${file}"
aws s3 cp "$file" "s3://${BACKUP_BUCKET}/${prefix}/${file}"

echo "Backup uploaded to s3://${BACKUP_BUCKET}/${prefix}/${file}"
