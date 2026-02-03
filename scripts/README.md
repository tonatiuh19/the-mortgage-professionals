# Real Estate Platform - Base Repo Scripts

**Base Repository:** https://github.com/tonatiuh19/real-state

This base repository serves as the source of truth for shared code across multiple client deployments. Each client has their own repo with custom branding while using the same database (isolated by `ENCORE_TENANT_ID`).

## Architecture

### Shared Database, Multiple Clients

- All clients use the same PostgreSQL database (see `database/schema.sql`)
- Client data is isolated using `ENCORE_TENANT_ID` in queries
- Each client repo has a unique tenant ID configured in `api/index.ts`

### Synced vs Client-Specific Files

**Synced from Base** (shared across all clients):

- `api/` - All backend API routes (except tenant ID value)
- `client/store/` - Redux store and slices
- `client/components/ui/` - Shared UI components
- `client/components/visuals/` - Shared visual components
- `client/pages/admin/` - Admin pages
- `client/pages/client/` - Client portal pages
- All wizards and business logic components
- Configuration files (package.json, tsconfig, etc.)

**Client-Specific** (unique per client):

- `client/components/layout/Footer.tsx` - Custom footer
- `client/components/layout/Navbar.tsx` - Custom header/nav
- `client/pages/Index.tsx` - Custom home page
- `client/global.css` - Custom styles and theme
- `.env` files - Environment variables
- `ENCORE_TENANT_ID` value in `api/index.ts`

## Usage

### 1. Initialize a New Client Repo

```bash
./scripts/init-client-repo.sh <client-repo-path> <tenant-id> <client-name>
```

**Example:**

```bash
./scripts/init-client-repo.sh ../acme-loans ACME001 "ACME Loans"
```

This will:

- Create a new client repo directory
- Copy all base files
- Configure the tenant ID
- Create client-specific config file
- Generate sync scripts for the client repo

### 2. Sync Base Changes to Existing Client

From the base repo:

```bash
./scripts/sync-to-client.sh <client-repo-path>
```

**Example:**

```bash
./scripts/sync-to-client.sh ../acme-loans
```

This will:

- Sync all shared files to the client repo
- Preserve client-specific files
- Maintain the client's ENCORE_TENANT_ID
- Create a backup before making changes

### 3. Client Repo: Sync from Base

From within a client repo:

```bash
./scripts/sync-from-base.sh
```

This will:

- Clone the latest base repo
- Run the sync process
- Update the last sync timestamp

## Configuration Files

### `scripts/sync-config.json`

Defines which files/folders are synced vs client-specific. Edit this to change sync behavior.

### Client: `scripts/client-config.json`

Created automatically in client repos. Contains:

- Client name
- Tenant ID
- Base repo URL
- Last sync date

## Deployment Configuration

### Vercel/Netlify

All deployment configuration files are synced from base:

- `vercel.json` - Vercel deployment settings
- `netlify.toml` - Netlify deployment settings
- `vite.config.ts` - Build configuration
- `vite.config.server.ts` - SSR configuration
- `package.json` - Build scripts and dependencies

These files are standardized across all clients. **DO NOT modify in client repos.**

Client-specific deployment settings (environment variables, domains, etc.) should be configured in the Vercel/Netlify dashboard, not in code.

## Workflow

### Making Changes to Base Repo

1. Make changes in this base repo
2. Test thoroughly
3. Commit and push
4. Sync to each client repo:
   ```bash
   ./scripts/sync-to-client.sh ../client-repo-1
   ./scripts/sync-to-client.sh ../client-repo-2
   ```
5. Each client reviews and tests changes

### Client-Specific Customizations

1. Only modify client-specific files listed above
2. Never modify synced files directly in client repo
3. If you need to change synced code, do it in base repo then sync

## Database Tenant Isolation

Every query in `api/index.ts` must include the tenant ID:

```typescript
const ENCORE_TENANT_ID = "CLIENT001"; // Unique per client

// Example query with tenant isolation
const loans = await db.query("SELECT * FROM loans WHERE tenant_id = $1", [
  ENCORE_TENANT_ID,
]);
```

**Critical:** Always check `database/schema.sql` for exact table structure and ensure all queries include tenant isolation.

## Troubleshooting

### Sync Conflicts

If sync creates issues:

1. Check `.sync-backups/` in client repo for previous versions
2. Manually review changes
3. Fix conflicts and test

### Tenant ID Issues

If wrong tenant ID in client repo:

1. Edit `scripts/client-config.json` in client repo
2. Run sync again to update `api/index.ts`

### Missing Files

If sync fails due to missing files:

1. Check `scripts/sync-config.json` paths
2. Ensure base repo is up to date
3. Run sync again

## Best Practices

1. **Always test in base repo first** before syncing to clients
2. **Document breaking changes** and notify all clients
3. **Version control** - use semantic versioning for major updates
4. **Backup before sync** - backups are automatic but verify
5. **Review migrations** - database changes affect all clients
6. **Test tenant isolation** - ensure queries don't leak data between clients

## Security Notes

- Each client has separate `.env` files (not synced)
- Tenant ID provides database-level isolation
- API keys and secrets are client-specific
- Never commit sensitive data to base repo
