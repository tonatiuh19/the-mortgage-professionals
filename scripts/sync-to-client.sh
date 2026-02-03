#!/bin/bash

# Script to sync base repo changes to a client repo
# Usage: ./scripts/sync-to-client.sh <client-repo-path>

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_REPO="$1"

if [ -z "$CLIENT_REPO" ]; then
  echo "❌ Error: Client repo path required"
  echo "Usage: ./scripts/sync-to-client.sh <client-repo-path>"
  exit 1
fi

if [ ! -d "$CLIENT_REPO" ]; then
  echo "❌ Error: Client repo directory does not exist: $CLIENT_REPO"
  exit 1
fi

if [ ! -f "$CLIENT_REPO/scripts/client-config.json" ]; then
  echo "⚠️  Warning: Client config not found. This may not be a properly initialized client repo."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "🔄 Syncing base repo to client repo..."
echo "   Base: $BASE_DIR"
echo "   Client: $CLIENT_REPO"
echo ""

# Read synced paths from config
SYNCED_PATHS=$(node -e "
  const config = require('$BASE_DIR/scripts/sync-config.json');
  console.log(config.syncedPaths.join(' '));
")

# Create backup timestamp
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Sync each path
for path in $SYNCED_PATHS; do
  SOURCE="$BASE_DIR/$path"
  DEST="$CLIENT_REPO/$path"
  
  if [ ! -e "$SOURCE" ]; then
    echo "⚠️  Skipping $path (not found in base repo)"
    continue
  fi
  
  # Create backup if destination exists
  if [ -e "$DEST" ]; then
    BACKUP_DIR="$CLIENT_REPO/.sync-backups/$BACKUP_TIMESTAMP"
    mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    cp -R "$DEST" "$BACKUP_DIR/$path" 2>/dev/null || true
  fi
  
  # Sync the file/directory
  mkdir -p "$(dirname "$DEST")"
  
  if [ -d "$SOURCE" ]; then
    rsync -av --delete "$SOURCE/" "$DEST/"
    echo "✅ Synced directory: $path"
  else
    cp "$SOURCE" "$DEST"
    echo "✅ Synced file: $path"
  fi
done

# Special handling for api/index.ts - preserve ENCORE_TENANT_ID
if [ -f "$CLIENT_REPO/scripts/client-config.json" ]; then
  TENANT_ID=$(node -e "
    const config = require('$CLIENT_REPO/scripts/client-config.json');
    console.log(config.tenantId || '');
  ")
  
  if [ ! -z "$TENANT_ID" ]; then
    echo ""
    echo "⚙️  Preserving client ENCORE_TENANT_ID: $TENANT_ID"
    sed -i.bak "s/const ENCORE_TENANT_ID = \"[^\"]*\"/const ENCORE_TENANT_ID = \"$TENANT_ID\"/" "$CLIENT_REPO/api/index.ts"
    rm "$CLIENT_REPO/api/index.ts.bak"
  fi
fi

echo ""
echo "✅ Sync complete!"
echo "   Backup created at: .sync-backups/$BACKUP_TIMESTAMP"
echo ""
echo "⚠️  Remember to:"
echo "   1. Review changes in the client repo"
echo "   2. Run npm install if package.json changed"
echo "   3. Test the application"
echo "   4. Commit and push changes"
