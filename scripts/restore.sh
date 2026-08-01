#!/usr/bin/env bash
set -e

DUMP="${1:?Usage: $0 <dump-file-or-s3-url> [target-database-url (defaults to DATABASE_URL)]}"
TARGET_URL="${2:-$DATABASE_URL}"

if [ -z "$TARGET_URL" ]; then
  echo "DATABASE_URL or second argument must be set" >&2
  exit 1
fi

# Strip ?schema=... from the target URL; pg_restore does not understand it.
TARGET_URL="${TARGET_URL%%\?*}"

# If the dump argument looks like an S3 URI, download it first.
LOCAL_DUMP="$DUMP"
if [[ "$DUMP" == s3://* ]]; then
  LOCAL_DUMP="/tmp/$(basename "$DUMP")"
  echo "Downloading $DUMP ..."
  aws s3 cp "$DUMP" "$LOCAL_DUMP"
fi

if [ ! -f "$LOCAL_DUMP" ]; then
  echo "Dump file not found: $LOCAL_DUMP" >&2
  exit 1
fi

echo "Restoring to target database ..."
pg_restore -d "$TARGET_URL" --clean --if-exists --no-owner --no-privileges "$LOCAL_DUMP"

echo "Restore complete. Verify with: DATABASE_URL=\"$TARGET_URL\" npx prisma migrate status"
