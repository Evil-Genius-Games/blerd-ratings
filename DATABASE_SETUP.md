# Database Setup Guide

This guide will help you set up the PostgreSQL database for Blerd Ratings.

## Option 1: Cloud Database (Recommended - Easiest)

### Using Neon (Free PostgreSQL)

1. Go to [https://neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (it will look like: `postgresql://user:password@host/dbname`)
4. Update your `.env` file:
   ```env
   DATABASE_URL="your-neon-connection-string"
   ```

### Using Supabase (Free PostgreSQL)

1. Go to [https://supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to Settings > Database
4. Copy the connection string
5. Update your `.env` file with the connection string

### Using Railway (Free PostgreSQL)

1. Go to [https://railway.app](https://railway.app) and sign up
2. Create a new PostgreSQL database
3. Copy the connection string
4. Update your `.env` file

## Option 2: Local PostgreSQL with Docker

If you have Docker installed:

```bash
docker run --name blerd-postgres \
  -e POSTGRES_USER=blerd \
  -e POSTGRES_PASSWORD=blerdpassword \
  -e POSTGRES_DB=blerd_ratings \
  -p 5432:5432 \
  -d postgres:15

# Then update .env:
# DATABASE_URL="postgresql://blerd:blerdpassword@localhost:5432/blerd_ratings?schema=public"
```

## Option 3: Install PostgreSQL Locally (macOS)

```bash
# Install via Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb blerd_ratings

# Update .env:
# DATABASE_URL="postgresql://your-username@localhost:5432/blerd_ratings?schema=public"
```

## After Setting Up Database Connection

Once you have your `DATABASE_URL` configured in `.env`:

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Run Migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

3. **Verify Setup:**
   ```bash
   npx prisma studio
   ```
   This will open a browser with Prisma Studio where you can view your database.

## Quick Test

After setup, you can test the connection:

```bash
npx prisma db pull
```

If this succeeds, your database is connected and ready!
