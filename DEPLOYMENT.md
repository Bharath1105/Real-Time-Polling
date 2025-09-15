# Database Deployment Guide

## Current Status
✅ **Local SQLite database** is already deployed and in sync with your schema.

## Production Deployment Options

### Option 1: Deploy to Cloud Database with Prisma Accelerate (Recommended)

#### Step 1: Choose a Database Provider
- **Neon** (PostgreSQL) - Free tier available
- **PlanetScale** (MySQL) - Free tier available  
- **Supabase** (PostgreSQL) - Free tier available
- **Railway** (PostgreSQL) - Free tier available

#### Step 2: Set up Database
1. Create a new database project
2. Get your connection string (should look like: `postgresql://username:password@host:port/database`)

#### Step 3: Set up Prisma Accelerate
1. Go to [Prisma Accelerate Dashboard](https://console.prisma.io/)
2. Create a new Accelerate project
3. Connect your database
4. Get your Accelerate connection string (should look like: `prisma://accelerate.prisma-data.net/?api_key=YOUR_API_KEY`)

#### Step 4: Update Environment Variables
Create a `.env` file with:
```bash
# For production with Prisma Accelerate
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=YOUR_ACCELERATE_API_KEY"

# For direct database connection (without Accelerate)
# DATABASE_URL="postgresql://username:password@host:port/database"
```

#### Step 5: Deploy Schema
```bash
# Use production schema
npx prisma db push --schema=prisma/schema.production.prisma

# Or create a migration
npx prisma migrate dev --name init --schema=prisma/schema.production.prisma
```

### Option 2: Deploy to Existing Cloud Database

If you already have a cloud database:

1. **Update your `.env` file** with the database URL
2. **Switch to production schema**:
   ```bash
   cp prisma/schema.production.prisma prisma/schema.prisma
   ```
3. **Deploy the schema**:
   ```bash
   npx prisma db push
   ```

### Option 3: Use Prisma Migrate (Recommended for Production)

For production applications, use migrations instead of `db push`:

```bash
# Initialize migrations
npx prisma migrate dev --name init

# Deploy to production
npx prisma migrate deploy
```

## Quick Commands

### Check Database Status
```bash
npx prisma db pull    # Pull current database schema
npx prisma db push    # Push schema to database
npx prisma studio     # Open database browser
```

### Generate Client
```bash
npx prisma generate --no-engine  # For Accelerate
npx prisma generate              # For regular database
```

## Current Schema Models
- **User**: User accounts with authentication
- **Poll**: Polling questions created by users
- **PollOption**: Individual options for each poll
- **Vote**: User votes on poll options

## Next Steps
1. Choose your preferred database provider
2. Set up the database and get connection string
3. Update environment variables
4. Deploy using the commands above
5. Test your application with the new database
