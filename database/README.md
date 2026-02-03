# Database Setup Guide

## Overview
This project uses MySQL database hosted on Hostgator for production deployment on Vercel.

## Database Schema
The complete schema is located in `database/schema.sql` with the following tables:

### Core Tables:
- **users** - User authentication and basic info (clients, brokers, admins)
- **user_profiles** - Extended user profile information
- **leads** - Lead tracking and management
- **lead_activities** - Lead interaction history
- **loan_applications** - Main application data
- **application_status_history** - Application status audit trail

### Documents & Tasks:
- **documents** - File uploads and document management
- **tasks** - Task assignment and tracking
- **workflow_templates** - Automated workflow definitions
- **workflow_steps** - Individual workflow step configurations

### Communication:
- **communications** - Email, SMS, call tracking
- **email_templates** - Reusable email templates
- **sms_templates** - Reusable SMS templates

### Marketing:
- **campaigns** - Marketing campaign management
- **campaign_recipients** - Campaign recipient tracking

### Compliance & System:
- **compliance_checklists** - Application compliance tracking
- **compliance_checklist_items** - Individual compliance items
- **audit_logs** - System-wide audit trail
- **notifications** - In-app notifications
- **system_settings** - Application configuration

## Setup Instructions

### 1. Hostgator Database Setup

1. Log in to your Hostgator cPanel
2. Navigate to "MySQL Databases"
3. Create a new database (e.g., `yourdomain_loanbroker`)
4. Create a database user with a strong password
5. Assign the user to the database with ALL PRIVILEGES
6. Note down the hostname (usually `localhost` or specific server)

### 2. Import Schema

**Option A: Using phpMyAdmin (Recommended for Hostgator)**
1. In cPanel, open phpMyAdmin
2. Select your database from the left sidebar
3. Click the "Import" tab
4. Choose `database/schema.sql`
5. Click "Go" to execute

**Option B: Using MySQL Command Line**
```bash
mysql -h your-hostname -u your-username -p your-database < database/schema.sql
```

### 3. Configure Environment Variables

**For Local Development:**
1. Copy `.env.example` to `.env`
2. Update with your Hostgator database credentials:
```env
DB_HOST=your-hostgator-hostname
DB_USER=yourdomain_dbuser
DB_PASSWORD=your-secure-password
DB_NAME=yourdomain_loanbroker
DB_PORT=3306
JWT_SECRET=your-random-secret-key
```

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DB_PORT` (usually 3306)
   - `JWT_SECRET`

### 4. Update Default Admin

After importing the schema, update the default admin password:

```sql
-- Generate a bcrypt hash for your password
-- Use online tool: https://bcrypt-generator.com/
-- Or use Node.js: bcrypt.hash('YourPassword123!', 10)

UPDATE users 
SET password_hash = '$2a$10$YourActualHashedPassword' 
WHERE email = 'admin@example.com';

-- Also update the email to your actual admin email
UPDATE users 
SET email = 'your-admin@yourdomain.com' 
WHERE role = 'admin';
```

### 5. Verify Connection

Test the database connection by calling the health endpoint:
```bash
curl https://your-vercel-app.vercel.app/api/health
```

## Database Connection

The database connection is managed in `server/lib/db.ts` which:
- Creates a connection pool for efficient connections
- Handles connection errors gracefully
- Provides helper functions for queries and transactions
- Works seamlessly with Vercel serverless functions

## API Routes

All API routes are consolidated in `api/index.ts` for Vercel deployment:

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Leads
- `GET /api/leads` - List leads
- `POST /api/leads` - Create lead
- `GET /api/leads/:id` - Get lead details
- `PUT /api/leads/:id` - Update lead

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `GET /api/applications/:id` - Get application
- `PUT /api/applications/:id` - Update application
- `POST /api/applications/:id/submit` - Submit application

### Documents
- `GET /api/documents?applicationId=X` - List documents
- `POST /api/documents` - Upload document metadata
- `POST /api/documents/:id/review` - Review document

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task

### Communications
- `GET /api/communications?applicationId=X` - List communications
- `POST /api/communications` - Send communication

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/:id/read` - Mark as read

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Security Notes

1. **Never commit `.env` file** - It's in .gitignore
2. **Use strong JWT_SECRET** - Generate with: `openssl rand -base64 32`
3. **Use strong database passwords**
4. **Enable SSL/TLS** for database connections if available on Hostgator
5. **Regularly backup** your database via cPanel
6. **Update admin password** immediately after setup

## Maintenance

### Backups
Set up automated backups in Hostgator cPanel:
1. Go to "Backup Wizard"
2. Schedule daily/weekly backups
3. Store backups in a safe location

### Monitoring
Monitor database performance:
- Check query logs in cPanel
- Monitor connection pool usage
- Set up alerts for failed connections

### Updates
When schema changes are needed:
1. Create migration SQL files
2. Test in development first
3. Apply to production during low-traffic periods
4. Keep backups before any schema changes

## Troubleshooting

### Connection Issues
- Verify hostname (might need to use remote MySQL hostname)
- Check if IP whitelisting is required
- Confirm database user has proper privileges
- Test connection using MySQL Workbench or similar tool

### Performance
- Add indexes for frequently queried columns
- Monitor slow query log
- Consider upgrading Hostgator plan if needed
- Use connection pooling (already implemented)

### Common Errors
- **Access denied**: Check username/password
- **Unknown database**: Verify database name
- **Too many connections**: Adjust connection pool settings
- **Connection timeout**: Check Hostgator server status

## Support

For Hostgator-specific issues:
- Contact Hostgator support
- Check their database documentation
- Verify MySQL version compatibility (schema uses MySQL 5.7+ features)
