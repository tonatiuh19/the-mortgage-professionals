#!/bin/bash

# Script to initialize a new client repo from base
# Usage: ./scripts/init-client-repo.sh <client-repo-path> <tenant-id> <client-name>

set -e

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLIENT_REPO="$1"
TENANT_ID="$2"
CLIENT_NAME="$3"

if [ -z "$CLIENT_REPO" ] || [ -z "$TENANT_ID" ] || [ -z "$CLIENT_NAME" ]; then
  echo "❌ Error: Missing required arguments"
  echo "Usage: ./scripts/init-client-repo.sh <client-repo-path> <tenant-id> <client-name>"
  echo ""
  echo "Example: ./scripts/init-client-repo.sh ../acme-loans ACME001 'ACME Loans'"
  exit 1
fi

if [ -d "$CLIENT_REPO" ]; then
  echo "⚠️  Warning: Directory already exists: $CLIENT_REPO"
  read -p "Continue and overwrite? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo "🚀 Initializing new client repo..."
echo "   Client: $CLIENT_NAME"
echo "   Tenant ID: $TENANT_ID"
echo "   Path: $CLIENT_REPO"
echo ""

# Create client repo directory
mkdir -p "$CLIENT_REPO"

# Copy entire base repo
echo "📦 Copying base files..."
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' --exclude='.sync-backups' "$BASE_DIR/" "$CLIENT_REPO/"

# Create client config
mkdir -p "$CLIENT_REPO/scripts"
cat > "$CLIENT_REPO/scripts/client-config.json" << EOF
{
  "clientName": "$CLIENT_NAME",
  "tenantId": "$TENANT_ID",
  "baseRepoUrl": "https://github.com/tonatiuh19/real-state",
  "lastSyncDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

# Update ENCORE_TENANT_ID in api/index.ts
echo "⚙️  Configuring tenant ID..."
sed -i.bak "s/const ENCORE_TENANT_ID = \"[^\"]*\"/const ENCORE_TENANT_ID = \"$TENANT_ID\"/" "$CLIENT_REPO/api/index.ts"
rm "$CLIENT_REPO/api/index.ts.bak"

# Create sync script for client repo
cat > "$CLIENT_REPO/scripts/sync-from-base.sh" << 'EOF'
#!/bin/bash

# Script to sync changes from base repo to this client repo
# Usage: ./scripts/sync-from-base.sh

set -e

CLIENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$CLIENT_DIR/scripts/client-config.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ Error: Client config not found: $CONFIG_FILE"
  exit 1
fi

BASE_REPO_URL=$(node -e "
  const config = require('$CONFIG_FILE');
  console.log(config.baseRepoUrl);
")

TENANT_ID=$(node -e "
  const config = require('$CONFIG_FILE');
  console.log(config.tenantId);
")

if [ "$BASE_REPO_URL" = "PLEASE_SET_BASE_REPO_URL" ]; then
  echo "❌ Error: Base repo URL not configured in scripts/client-config.json"
  exit 1
fi

echo "🔄 Syncing from base repo..."
echo "   Base: $BASE_REPO_URL"
echo ""

# Clone/pull base repo to temp directory
TEMP_DIR="/tmp/real-state-base-$$"
trap "rm -rf $TEMP_DIR" EXIT

if [ -d "$TEMP_DIR" ]; then
  rm -rf "$TEMP_DIR"
fi

git clone "$BASE_REPO_URL" "$TEMP_DIR"

# Run sync script from base repo
bash "$TEMP_DIR/scripts/sync-to-client.sh" "$CLIENT_DIR"

# Update last sync date
node -e "
  const fs = require('fs');
  const config = require('$CONFIG_FILE');
  config.lastSyncDate = new Date().toISOString();
  fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
"

echo ""
echo "✅ Sync from base complete!"
EOF

chmod +x "$CLIENT_REPO/scripts/sync-from-base.sh"

# Create README for client repo
cat > "$CLIENT_REPO/CLIENT_README.md" << EOF
# $CLIENT_NAME - Real Estate Loan Platform

This is a client-specific instance of the Real Estate Loan Platform.

## Client Configuration

- **Client Name**: $CLIENT_NAME
- **Tenant ID**: \`$TENANT_ID\`

## Client-Specific Files

These files are unique to this client and should NOT be synced from base:

- \`client/components/layout/Footer.tsx\` - Custom footer
- \`client/components/layout/Navbar.tsx\` - Custom navigation
- \`client/pages/Index.tsx\` - Custom home page
- \`client/global.css\` - Custom styles and theme
- \`.env\` files - Environment configuration

## Syncing from Base Repo

To pull latest changes from the base repo:

\`\`\`bash
./scripts/sync-from-base.sh
\`\`\`

This will:
1. Clone the latest base repo
2. Sync all shared files (API, components, store, etc.)
3. Preserve your client-specific files
4. Maintain your ENCORE_TENANT_ID configuration

⚠️ **Always review changes after sync and test thoroughly!**

## Development

\`\`\`bash
npm install
npm run dev
\`\`\`

## Database

This client uses a shared database with other clients, isolated by tenant ID: \`$TENANT_ID\`
EOF

echo ""
echo "✅ Client repo initialized successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. cd $CLIENT_REPO"
echo "   2. Customize client-specific files:"
echo "      - client/components/layout/Footer.tsx"
echo "      - client/components/layout/Navbar.tsx"
echo "      - client/pages/Index.tsx"
echo "      - client/global.css"
echo "   3. Configure .env file with database and API keys"
echo "   4. Initialize git: git init && git add . && git commit -m 'Initial commit'"
echo "   5. npm install && npm run dev"
echo ""
echo "📖 See CLIENT_README.md in the client repo for more info"
