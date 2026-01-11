# Blerd Ratings

A web application for rating movies based on diversity and inclusion. Users can discover, rate, and review movies while contributing to a community-driven database of film ratings focused on representation.

## Features

- 🎬 **Movie Database**: Browse and search movies with detailed information
- ⭐ **Rating System**: Rate movies on diversity (1-5) and inclusion (1-5) scales
- 💬 **Reviews**: Add comments and read reviews from other users
- 🔐 **Authentication**: Secure user registration and login system
- 🕷️ **Web Scraping**: Automatically scrape recent movies from IMDb
- 📊 **Statistics**: View average ratings and community feedback
- 🎨 **Modern UI**: Beautiful, responsive design with dark mode support

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Web Scraping**: Cheerio, Axios
- **Deployment**: Ready for Vercel

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or cloud)

## Getting Started

### 1. Clone and Install

```bash
cd blerd-ratings
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/blerd_ratings?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here" # Generate with: openssl rand -base64 32

# Optional: TMDB API Key for enhanced movie search
TMDB_API_KEY="your-tmdb-api-key"
```

### 3. Set Up Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# (Optional) Open Prisma Studio to view data
npx prisma studio
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
blerd-ratings/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/    # NextAuth API routes
│   │   │   └── register/         # User registration
│   │   ├── movies/
│   │   │   ├── [id]/             # Individual movie API
│   │   │   ├── scrape/           # Web scraping endpoint
│   │   │   └── route.ts          # Movies list API
│   │   └── ratings/               # Rating CRUD operations
│   ├── login/                     # Login page
│   ├── register/                  # Registration page
│   ├── movies/
│   │   ├── [id]/                  # Movie detail page
│   │   └── page.tsx               # Movies listing page
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── components/
│   ├── Navbar.tsx                 # Navigation component
│   └── Providers.tsx              # Session provider
├── lib/
│   ├── auth.ts                    # NextAuth configuration
│   ├── prisma.ts                  # Prisma client
│   └── scraper.ts                 # Web scraping utilities
├── prisma/
│   └── schema.prisma              # Database schema
└── types/
    └── next-auth.d.ts             # NextAuth type definitions
```

## Database Schema

### User
- User accounts with authentication
- Supports email/password and OAuth (extensible)

### Movie
- Movie information (title, director, cast, etc.)
- Links to IMDb and TMDB
- Stores scraped data

### Rating
- User ratings for movies
- Diversity score (1-5)
- Inclusion score (1-5)
- Optional comments
- One rating per user per movie

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Movies
- `GET /api/movies` - List movies (supports search, pagination)
- `GET /api/movies/[id]` - Get movie details with ratings
- `POST /api/movies/scrape` - Scrape recent movies from IMDb

### Ratings
- `GET /api/ratings` - Get user ratings (supports filtering)
- `POST /api/ratings` - Create or update a rating

## Web Scraping

The app includes web scraping functionality to automatically collect movie data:

1. **Scrape Recent Movies**: Fetches movies currently in theaters or coming soon from IMDb
2. **Scrape Individual Movie**: Scrapes detailed information for a specific movie by IMDb ID

To scrape movies:
- Use the "Scrape Recent Movies" button on the movies page
- Or call the API endpoint: `POST /api/movies/scrape` with `{ action: 'recent' }`

## Development

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration-name

# Apply migrations in production
npx prisma migrate deploy
```

### Generate Prisma Client

After schema changes:
```bash
npx prisma generate
```

### Type Checking

```bash
npm run build
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

Make sure to set:
- `DATABASE_URL` - Your production PostgreSQL connection string
- `NEXTAUTH_URL` - Your production URL
- `NEXTAUTH_SECRET` - A secure random string

### Database Setup

For production, use a managed PostgreSQL service:
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Neon](https://neon.tech)
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

## Future Enhancements

- [ ] OAuth providers (Google, GitHub)
- [ ] Advanced filtering and sorting
- [ ] User profiles and rating history
- [ ] Movie recommendations
- [ ] Social features (follow users, share ratings)
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] Mobile app

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
