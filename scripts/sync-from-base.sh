#!/bin/bash

# Script to sync changes from base repo to this client repo
# Usage: ./scripts/sync-from-base.sh

set -e

CLIENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_REPO_URL="https://github.com/tonatiuh19/real-state"
TEMP_BASE_DIR="/tmp/real-state-base-$$"

echo "🔄 Syncing from base repository..."
echo "   Base: $BASE_REPO_URL"
echo "   Client: $CLIENT_DIR"
echo ""

# Check if client config exists
if [ ! -f "$CLIENT_DIR/scripts/client-config.json" ]; then
  echo "⚠️  Warning: scripts/client-config.json not found."
  echo "   This file should contain your tenant ID and client name."
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Clone base repo to temp directory
echo "📦 Cloning base repository..."
git clone --depth 1 "$BASE_REPO_URL" "$TEMP_BASE_DIR"

if [ ! -d "$TEMP_BASE_DIR" ]; then
  echo "❌ Error: Failed to clone base repository"
  exit 1
fi

echo "✅ Base repository cloned"
echo ""

# Read synced paths from config
SYNCED_PATHS=$(node -e "
  const config = require('$CLIENT_DIR/scripts/sync-config.json');
  console.log(config.syncedPaths.join('\n'));
")

# Save current tenant ID if it exists
TENANT_ID=""
if [ -f "$CLIENT_DIR/api/index.ts" ]; then
  TENANT_ID=$(grep -oP 'const ENCORE_TENANT_ID\s*=\s*"\K[^"]+' "$CLIENT_DIR/api/index.ts" 2>/dev/null || echo "")
fi

# Create backup
BACKUP_DIR="$CLIENT_DIR/.sync-backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "💾 Creating backup in $BACKUP_DIR"

# Sync each path
echo ""
echo "📋 Syncing files..."
while IFS= read -r path; do
  SOURCE="$TEMP_BASE_DIR/$path"
  DEST="$CLIENT_DIR/$path"
  
  if [ ! -e "$SOURCE" ]; then
    echo "   ⚠️  Skipping $path (not found in base repo)"
    continue
  fi
  
  # Create backup if destination exists
  if [ -e "$DEST" ]; then
    mkdir -p "$(dirname "$BACKUP_DIR/$path")"
    cp -r "$DEST" "$BACKUP_DIR/$path" 2>/dev/null || true
  fi
  
  # Sync the file/directory
  mkdir -p "$(dirname "$DEST")"
  
  if [ -d "$SOURCE" ]; then
    echo "   📁 $path/"
    rsync -a --delete "$SOURCE/" "$DEST/"
  else
    echo "   📄 $path"
    cp "$SOURCE" "$DEST"
  fi
done <<< "$SYNCED_PATHS"

# Restore tenant ID if it was found
if [ -n "$TENANT_ID" ] && [ -f "$CLIENT_DIR/api/index.ts" ]; then
  echo ""
  echo "🔐 Restoring tenant ID: $TENANT_ID"
  
  # Use node to safely update the tenant ID
  node -e "
    const fs = require('fs');
    const filePath = '$CLIENT_DIR/api/index.ts';
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(
      /const ENCORE_TENANT_ID\s*=\s*\"[^\"]+\"/,
      'const ENCORE_TENANT_ID = \"$TENANT_ID\"'
    );
    fs.writeFileSync(filePath, content);
  "
fi

# Update last sync date in client config if it exists
if [ -f "$CLIENT_DIR/scripts/client-config.json" ]; then
  CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CLIENT_DIR/scripts/client-config.json', 'utf8'));
    config.lastSyncDate = '$CURRENT_DATE';
    fs.writeFileSync('$CLIENT_DIR/scripts/client-config.json', JSON.stringify(config, null, 2) + '\n');
  "
  echo "📅 Updated last sync date in client-config.json"
fi

# Cleanup
echo ""
echo "🧹 Cleaning up..."
rm -rf "$TEMP_BASE_DIR"

echo ""
echo "✅ Sync complete!"
echo ""
echo "📌 Next steps:"
echo "   1. Review changes with: git diff"
echo "   2. Install dependencies: npm install"
echo "   3. Test your application: npm run dev"
echo "   4. Commit changes: git add . && git commit -m 'Sync from base repo'"
echo ""
echo "💾 Backup saved in: $BACKUP_DIR"
