# GitHub Copilot Custom Instructions - Client Repo

> **⚠️ IMPORTANT: This is a CLIENT REPO**
>
> This repository is synced from the base repo: https://github.com/tonatiuh19/real-state main branch
>
> **READ THESE RULES CAREFULLY BEFORE MAKING ANY CHANGES**

## 🚨 CRITICAL RULES - MUST FOLLOW

### Synced vs Client-Specific Files

#### ❌ DO NOT MODIFY (Synced from Base)

These files are automatically synced from the base repo. **ANY CHANGES WILL BE OVERWRITTEN:**

- `api/` - Backend API routes (except ENCORE_TENANT_ID value)
- `client/store/` - Redux state management
- `client/components/ui/` - UI component library
- `client/components/visuals/` - Visual components
- `client/components/BrokerWizard.tsx`
- `client/components/ClientLoginModal.tsx`
- `client/components/MetaHelmet.tsx`
- `client/components/NewLoanWizard.tsx`
- `client/components/TaskCompletionModal.tsx`
- `client/components/TaskWizard.tsx`
- `client/components/layout/AdminLayout.tsx`
- `client/components/layout/AppLayout.tsx`
- `client/components/layout/ClientLayout.tsx`
- `client/pages/admin/` - Admin pages
- `client/pages/client/` - Client portal pages
- `client/pages/ApplicationWizard.tsx`
- `client/pages/BrokerLogin.tsx`
- `client/pages/ClientLogin.tsx`
- `client/pages/NotFound.tsx`
- `client/pages/UnderConstruction.tsx`
- `client/hooks/` - Custom React hooks
- `client/lib/` - Utility libraries
- `client/App.tsx`, `client/AppRoutes.tsx`, `client/main.tsx`
- `database/` - Database schema and migrations
- `shared/` - Shared TypeScript types
- All config files:
  - `package.json` - Dependencies and scripts
  - `tsconfig.json` - TypeScript configuration
  - `vite.config.ts` - Vite build configuration
  - `vite.config.server.ts` - Server-side Vite config
  - `vercel.json` - Vercel deployment configuration
  - `netlify.toml` - Netlify deployment configuration
  - `postcss.config.js`, `tailwind.config.ts`, etc.

**If you need to modify any of these, the change must be made in the BASE REPO, then synced to all clients.**

> **🎨 IMPORTANT: These files define THIS CLIENT's unique identity and branding**
>
> **MUST keep originality for each client - these should NEVER look the same across clients!**

- **`client/pages/Index.tsx`** - Home page
- **`client/components/layout/Header.tsx`** - Navigation/header
- **`client/components/layout/Footer.tsx`** - Footer
- **`client/global.css`** - Styles, theme, colors
- **`.env`** files - Environment variables
- **`scripts/client-config.json`** - Client metadata

### Database Rules

- **ALWAYS reference `database/schema.sql` for exact table structure**
- **NEVER assume column names - verify in schema.sql first**
- **ALWAYS include `tenant_id` in WHERE clauses** - this isolates client data
- **NEVER modify database schema** - schema changes must go through base repo
- This client's tenant ID: **[CHECK scripts/client-config.json]**

```typescript
// ✅ CORRECT - Includes tenant isolation
const ENCORE_TENANT_ID = "CLIENT001"; // From scripts/client-config.json
const loans = await db.query(
  "SELECT * FROM loans WHERE tenant_id = $1 AND status = $2",
  [ENCORE_TENANT_ID, "active"],
);

// ❌ WRONG - Missing tenant_id
const loans = await db.query("SELECT * FROM loans WHERE status = $1", [
  "active",
]);
```

### Data Fetching Rules

- **NEVER fetch data directly in components with axios or fetch**
- **ALL data fetching MUST be done in Redux store (slices) using createAsyncThunk**
- **Components ONLY dispatch actions and select state from store**

```typescript
// ✅ CORRECT - In Redux slice
export const fetchLoans = createAsyncThunk(
  "loans/fetchLoans",
  async (_, { getState }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const { data } = await axios.get("/api/loans", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data;
  },
);

// ✅ CORRECT - In component
const dispatch = useAppDispatch();
const { loans, loading } = useAppSelector((state) => state.loans);
useEffect(() => {
  dispatch(fetchLoans());
}, [dispatch]);

// ❌ WRONG - Direct fetch in component
const [loans, setLoans] = useState([]);
useEffect(() => {
  axios.get("/api/loans").then((res) => setLoans(res.data)); // NEVER DO THIS
}, []);
```

## Package Manager

- **Always use npm** (never pnpm or yarn)
- **Always use logger** for debugging inside `client/lib/logger.ts`

## Styling Guidelines

### Use Existing Theme

- **Follow the color palette in `client/global.css`** - use existing theme colors
- Use TailwindCSS 3 utility classes as primary styling method
- **Keep designs simple, cool, and engaging** - prioritize clean UX
- Add cool animations and transitions for smooth UX

### Client-Specific Customization

You can freely modify colors and theme in **`client/global.css`** for this client:

```css
:root {
  /* Customize these for your client */
  --primary: your-color;
  --secondary: your-color;
  /* etc. */
}
```

## Form Validation

- **Always use Formik with Yup** for form validation
- Create Yup schemas for all forms

```typescript
import { useFormik } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
});

const formik = useFormik({
  initialValues: { email: "" },
  validationSchema,
  onSubmit: (values) => dispatch(submitForm(values)),
});
```

## Path Aliases

- `@/*` - Maps to `client/` folder
- `@shared/*` - Maps to `shared/` folder

Always use these aliases instead of relative imports.

## Icons

- Use Lucide React icons library as primary choice
- If Lucide doesn't have the icon, use react-icons as alternative

## Syncing from Base Repo

When base repo is updated:

```bash
./scripts/sync-from-base.sh
```

This will:

- Pull latest shared code
- Preserve your client-specific files
- Maintain your tenant ID
- Create backup in `.sync-backups/`

**After syncing:**

1. Review changes with `git diff`
2. Run `npm install` if package.json changed
3. Test thoroughly
4. Commit and deploy

## Type Safety

- TypeScript throughout
- Shared types in `shared/` folder
- **If any type issue is generated, fix it immediately**
- Ensure all TypeScript types are correct and consistent

## API Development

### When to Create API Endpoints

**STOP! API changes must go in BASE REPO.**

If you need a new endpoint:

1. Request it in the base repo
2. Wait for it to be added
3. Sync to get the new endpoint

Only create endpoints here if it's truly client-specific (very rare).

## Client Configuration

Your client configuration is in **`scripts/client-config.json`**:

```json
{
  "clientName": "Your Client Name",
  "tenantId": "YOUR_TENANT_ID",
  "baseRepoUrl": "https://github.com/tonatiuh19/real-state",
  "lastSyncDate": "2026-02-03T00:00:00Z"
}
```

This tenant ID is used in `api/index.ts` for database isolation.

## Vercel Deployment

This repo is configured for Vercel deployment:

- **`vercel.json`** - Deployment configuration (synced from base)
- **`vite.config.ts`** - Build configuration (synced from base)
- **`package.json`** - Build scripts (synced from base)

**DO NOT modify these files.** Vercel settings are standardized across all clients.

### Environment Variables on Vercel

Set these in Vercel dashboard (not in code):

- `DATABASE_URL` - PostgreSQL connection string
- `VITE_API_KEY` - Client-specific API keys
- Any other client-specific environment variables

## Before Making Changes

**Always ask yourself:**

1. **Is this file synced from base?** → Don't modify, request change in base repo
2. **Is this client-specific?** → Safe to modify
3. **Does this affect the database?** → Must include tenant_id isolation
4. **Is this a data fetch?** → Must be in Redux store, not component
5. **Am I using Formik + Yup?** → Required for forms

## Getting Help

- **Base repo issues**: https://github.com/tonatiuh19/real-state/issues
- **Client-specific issues**: Handle in this repo
- **Sync problems**: Check CLIENT_SETUP_GUIDE.md
