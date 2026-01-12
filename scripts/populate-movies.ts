import 'dotenv/config'
import { scrapeMoviesLastNYearsHybrid } from '../lib/scraper'
import { prisma } from '../lib/prisma'

async function populateDatabase() {
  console.log('Starting movie database population with HYBRID approach...\n')
  console.log('Step 1: Fetch bulk data from TMDB API')
  console.log('Step 2: Enrich with IMDb data (posters, descriptions, cast)\n')
  
  const tmdbApiKey = process.env.TMDB_API_KEY
  
  if (!tmdbApiKey) {
    console.error('❌ ERROR: TMDB_API_KEY not found in .env file')
    console.error('Please get a free API key from: https://www.themoviedb.org/settings/api')
    console.error('Then add it to your .env file: TMDB_API_KEY=your_api_key_here')
    process.exit(1)
  }

  try {
    // Use hybrid approach: TMDB for bulk, IMDb for enrichment
    const movies = await scrapeMoviesLastNYearsHybrid(5, tmdbApiKey, true)
    
    console.log(`\n✅ Scraping complete. Found ${movies.length} movies.`)
    console.log('Now saving to database...\n')

    let saved = 0
    let skipped = 0
    let errors = 0

    // Save in batches to avoid overwhelming the database
    const batchSize = 50
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (movie) => {
          try {
            // Use IMDb ID as primary key if available, otherwise TMDB ID
            const whereClause = movie.imdbId 
              ? { imdbId: movie.imdbId }
              : movie.tmdbId 
              ? { tmdbId: movie.tmdbId }
              : null

            if (!whereClause) {
              skipped++
              return
            }

            await prisma.movie.upsert({
              where: whereClause,
              update: {
                title: movie.title,
                releaseDate: movie.releaseDate,
                director: movie.director,
                description: movie.description,
                posterUrl: movie.posterUrl,
                tmdbId: movie.tmdbId,
                imdbId: movie.imdbId,
                genres: movie.genres || [],
                cast: movie.cast || [],
                runtime: movie.runtime,
                updatedAt: new Date(),
              },
              create: {
                title: movie.title,
                releaseDate: movie.releaseDate,
                director: movie.director,
                description: movie.description,
                posterUrl: movie.posterUrl,
                imdbId: movie.imdbId,
                tmdbId: movie.tmdbId,
                genres: movie.genres || [],
                cast: movie.cast || [],
                runtime: movie.runtime,
              },
            })

            saved++
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'
            console.error(`Error saving ${movie.title}:`, errorMessage)
            errors++
          }
        })
      )

      // Progress update
      const processed = Math.min(i + batchSize, movies.length)
      console.log(`  Progress: ${processed}/${movies.length} movies processed (${saved} saved, ${errors} errors)`)
    }

    console.log(`\n=== Population Complete ===`)
    console.log(`Total movies found: ${movies.length}`)
    console.log(`Successfully saved: ${saved}`)
    console.log(`Skipped: ${skipped}`)
    console.log(`Errors: ${errors}`)
    
  } catch (error) {
    console.error('Fatal error during population:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
populateDatabase()
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
