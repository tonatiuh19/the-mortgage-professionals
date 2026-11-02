# GitHub Copilot Custom Instructions

## ⚠️ CRITICAL RULES - MUST FOLLOW

- **ALWAYS reference `database/schema.sql` for exact table structure and column names**
- **NEVER assume column names - verify in schema.sql before writing SQL queries**
- **NEVER fetch data directly in components with axios or fetch**
- **ALL data fetching MUST be done in Redux store (slices) using createAsyncThunk**
- **Components ONLY dispatch actions and select state from store**
- **NEVER touch schema.sql, any database changes must be made through migration files in `database/migrations/`**
- **When using any console logging for debugging use logger functions from `client/utils/logger.ts` for consistent formatting and log levels only in UI components**
- **NEVER Patch issues, always fix the root cause of type errors or bugs immediately**
- **if any update is made to api/index.ts, update swagger.yaml accordingly**
- **if any revelant change update DESIGN_SYSTEM.md**
- **Always think about mobile responsiveness and cool, engaging UI/UX when making frontend changes**
- **if there is an opportunity to add reusable components or utilities, do it immediately to avoid technical debt**
- **Avoid any breaking changes**
- **Always review the chat history before making changes to understand what has already been fixed or implemented, and avoid reintroducing previously resolved issues**
- **All required API logic should remain inline within api/index.ts, as the application is deployed on Vercel using a serverless architecture**
- **NEVER add `import ... from "../shared/..."` (or `@shared/...`) in `api/index.ts` for runtime helpers** — Vercel bundles only `api/index.ts` into `/var/task`; missing modules cause production `ERR_MODULE_NOT_FOUND` and 500s on all API routes. Put reusable logic in `shared/` for **client, types, and smoke tests**, then **copy/inline the runtime version** into `api/index.ts` (see billing and per-owner CRM sections there). Keep `shared/` as the source of truth; duplicate in the API file when server code needs it.
- **Every new feature, bug fix, or implementation must be thoroughly validated across the UI, backend, and database layers using non-production test data. Testing must include happy paths, edge cases, error scenarios, and unexpected user behavior to identify potential gaps early and prevent regressions or future production issues**
- **NO EXCEPTIONS to these rules**

### Package Manager

- **Always use npm** (never pnpm or yarn)
- **Always use logger** for debugging (e.g., `console.log`, `console.error`) inside lib folder

### Backend

- Apis are in api/index.ts
- TypeScript throughout
- Single port (8080) for both frontend/backend in development
- **CRITICAL: Always reference `database/schema.sql` for database structure and table definitions**
- **NEVER assume column names - check schema.sql first**
- **If any database update is made based on schema.sql, generate a migration file** in `database/migrations/` with timestamp prefix (e.g., `YYYYMMDD_HHMMSS_description.sql`) for **TiDB Cloud Serverless** (MySQL 8.0 compatible)
- **If a type issue is generated, fix it immediately** - ensure all TypeScript types are correct and consistent across client, api/index.ts, and shared

#### Vercel serverless (`api/index.ts`)

`vercel.json` routes `/api/*` to a **single** serverless function (`api/index.ts`). At runtime only that entry file (plus `node_modules`) is guaranteed in `/var/task`.

| Do | Don't |
|----|-------|
| Inline handlers, SQL, and runtime helpers in `api/index.ts` | `import` from `shared/api.ts` in `api/index.ts` (it re-exports types that pull in other `shared/` modules) |
| Add types/DTOs to `shared/api.ts` for client + OpenAPI alignment | `import` new modules from `shared/` or `client/` for API runtime code |
| Add smoke tests in `scripts/` that import from `shared/` | Refactor API logic into `shared/` without inlining a copy in `api/index.ts` |

**Pattern for shared + API logic:** implement in `shared/feature.ts` → use from client and smoke tests → duplicate the functions/types needed at runtime into a clearly marked `// ... inlined for Vercel serverless` block in `api/index.ts`. When changing behavior, update **both** places (or extract from `shared/` into the inline block during the change).

**Legacy note:** `api/index.ts` may still import `shared/bulk-import.js`. Do not add new `shared/` imports (including `shared/api.ts`). If a legacy import breaks in prod, inline it the same way.

### Running Migrations (TiDB Cloud)

DB credentials are in `.env` at the project root. To apply a migration:

```bash
# 1. Check if already applied (table check example)
DB_PASS=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2-) && \
DB_HOST=$(grep "^DB_HOST" .env | cut -d'=' -f2-) && \
DB_PORT=$(grep "^DB_PORT" .env | cut -d'=' -f2-) && \
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2-) && \
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2-) && \
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  --ssl-mode=REQUIRED --protocol=TCP \
  -e "SHOW TABLES LIKE 'your_table_name';" 2>&1

# 2. Apply the migration
DB_PASS=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2-) && \
DB_HOST=$(grep "^DB_HOST" .env | cut -d'=' -f2-) && \
DB_PORT=$(grep "^DB_PORT" .env | cut -d'=' -f2-) && \
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2-) && \
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2-) && \
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  --ssl-mode=REQUIRED --protocol=TCP \
  < database/migrations/YOUR_MIGRATION_FILE.sql 2>&1

# 3. Verify
DB_PASS=$(grep "^DB_PASSWORD" .env | cut -d'=' -f2-) && \
DB_HOST=$(grep "^DB_HOST" .env | cut -d'=' -f2-) && \
DB_PORT=$(grep "^DB_PORT" .env | cut -d'=' -f2-) && \
DB_USER=$(grep "^DB_USER" .env | cut -d'=' -f2-) && \
DB_NAME=$(grep "^DB_NAME" .env | cut -d'=' -f2-) && \
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" \
  --ssl-mode=REQUIRED --protocol=TCP \
  -e "DESCRIBE your_table_name;" 2>&1
```

- All DB connection values are in `.env` (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
- Always use `--ssl-mode=REQUIRED --protocol=TCP`
- After applying, **update `database/schema.sql`** to reflect the new table/column

## Project Structure

### Client (Frontend)

- `client/pages/` - Route components (Index.tsx = home page)
- `client/components/ui/` - Pre-built UI component library
- `client/App.tsx` - App entry point with SPA routing setup
- `client/global.css` - TailwindCSS theming and global styles
- Add cool, engage, modern UI components
- Need to use cool animations and transitions for smooth UX
- When console logging for debugging, always use logger functions from `client/utils/logger.ts` for consistent formatting and log levels

### Shared

- `shared/` - Types, pure helpers, and interfaces used by **client**, **smoke tests**, and **type alignment** with the API
- `shared/api.ts` - Shared API request/response interfaces (import via `@shared/*` in client only)
- **Not bundled into Vercel API runtime** — do not rely on `shared/` imports from `api/index.ts` for new server logic (see **Vercel serverless** under Backend)

## Path Aliases

- `@/*` - Maps to `client/` folder
- `@shared/*` - Maps to `shared/` folder

Always use these aliases instead of relative imports.

## Styling Guidelines

### Primary Styling Method

- Use TailwindCSS 3 utility classes as the primary styling method
- Configure theme and design tokens in `client/global.css` and `tailwind.config.ts`
- **Always follow the color palette defined in `client/global.css`** - use existing theme colors
- **Keep designs simple, cool, and engaging** - prioritize clean UX

## API Development

### When to Create API Endpoints

**Only create API endpoints when strictly necessary**, such as:

- Handling private keys or secrets
- Database operations
- Server-side logic that cannot be exposed to the client

4. Use in React components with Redux store and axios

```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import { MyRouteResponse } from "@shared/api";

// In your slice file
export const fetchMyData = createAsyncThunk("mySlice/fetchMyData", async () => {
  const { data } = await axios.get<MyRouteResponse>("/api/my-endpoint");
  return data;
});
```

## State Management

### ⚠️ DATA FETCHING RULES (MANDATORY)

**CRITICAL: ALL data fetching MUST happen in Redux store, NEVER in components**

✅ **CORRECT Pattern:**

```typescript
// In client/store/slices/mySlice.ts
export const fetchData = createAsyncThunk(
  "slice/fetchData",
  async (_, { getState }) => {
    const { sessionToken } = (getState() as RootState).brokerAuth;
    const { data } = await axios.get("/api/endpoint", {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    return data;
  },
);

// In component
const dispatch = useAppDispatch();
const { data, loading } = useAppSelector((state) => state.mySlice);

useEffect(() => {
  dispatch(fetchData());
}, [dispatch]);
```

❌ **INCORRECT Pattern (NEVER DO THIS):**

```typescript
// WRONG: Direct axios call in component
const [data, setData] = useState([]);
useEffect(() => {
  axios.get("/api/endpoint").then((res) => setData(res.data)); // ❌ NEVER DO THIS
}, []);
```

### General Redux Rules

- **Always use Redux store** (`client/store/`) for state management
- Use Redux hooks: `useAppDispatch` and `useAppSelector` from `client/store/hooks.ts`
- Create slices in `client/store/slices/` following existing patterns
- Never use local state for data that should be shared across components
- **Always use axios for API calls from Redux store** - never use fetch directly
- Use `createAsyncThunk` for async operations in slices
- Components should only dispatch actions and select state from the store

## Form Validation

- **Always use Formik with Yup** for form validation
- Create Yup schemas for all forms
- Use Formik hooks: `useFormik` or `<Formik>` component
- Define validation schemas separately for reusability
- Example:

```typescript
import { useFormik } from "formik";
import * as Yup from "yup";

const validationSchema = Yup.object({
  email: Yup.string().email("Invalid email").required("Required"),
  name: Yup.string().required("Required"),
});

const formik = useFormik({
  initialValues: { email: "", name: "" },
  validationSchema,
  onSubmit: (values) => dispatch(submitForm(values)),
});
```

## Component Guidelines

### UI Components

- Pre-built UI component library available in `client/components/ui/`
- Components use Radix UI primitives with TailwindCSS styling
- Always check existing UI components before creating new ones
- **Keep UI simple, cool, and engaging** - focus on clean user experience

### Icons

- Use Lucide React icons library as primary choice
- Import from `lucide-react`
- If Lucide doesn't have a cool/engaging icon, use react-icons as alternative
- Import from `react-icons` (e.g., `react-icons/fa`, `react-icons/bs`, etc.)
