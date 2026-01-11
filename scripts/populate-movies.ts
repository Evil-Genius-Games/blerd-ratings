import 'dotenv/config'
import { scrapeMoviesLastNYears, scrapeIMDb } from '../lib/scraper'
import { prisma } from '../lib/prisma'

async function populateDatabase() {
  console.log('Starting movie database population...\n')
  
  try {
    // Scrape movies from the last 5 years
    // Try to use TMDB API if available, otherwise fall back to IMDb scraping
    const tmdbApiKey = process.env.TMDB_API_KEY
    const movies = await scrapeMoviesLastNYears(5, tmdbApiKey)
    
    console.log(`\nScraping complete. Found ${movies.length} movies.`)
    console.log('Now enriching with detailed data and saving to database...\n')

    let saved = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i]
      
      if (!movie.imdbId) {
        console.log(`Skipping ${movie.title} - no IMDb ID`)
        skipped++
        continue
      }

      try {
        // Always enrich with full details from IMDb to get poster, description, and cast
        let movieData = movie
        console.log(`Enriching ${movie.title} with full details (poster, description, cast)...`)
        const enriched = await scrapeIMDb(movie.imdbId)
        if (enriched) {
          movieData = {
            ...movie,
            ...enriched,
            // Prefer enriched data, but keep original if enriched doesn't have it
            title: enriched.title || movie.title,
            releaseDate: enriched.releaseDate || movie.releaseDate,
            posterUrl: enriched.posterUrl || movie.posterUrl,
            description: enriched.description || movie.description,
            director: enriched.director || movie.director,
            cast: enriched.cast && enriched.cast.length > 0 ? enriched.cast : movie.cast,
            genres: enriched.genres && enriched.genres.length > 0 ? enriched.genres : movie.genres,
            runtime: enriched.runtime || movie.runtime,
          }
        }
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500))

        // Save to database
        const savedMovie = await prisma.movie.upsert({
          where: { imdbId: movie.imdbId },
          update: {
            title: movieData.title,
            releaseDate: movieData.releaseDate,
            director: movieData.director,
            description: movieData.description,
            posterUrl: movieData.posterUrl,
            tmdbId: movieData.tmdbId,
            genres: movieData.genres || [],
            cast: movieData.cast || [],
            runtime: movieData.runtime,
            updatedAt: new Date(),
          },
          create: {
            title: movieData.title,
            releaseDate: movieData.releaseDate,
            director: movieData.director,
            description: movieData.description,
            posterUrl: movieData.posterUrl,
            imdbId: movieData.imdbId,
            tmdbId: movieData.tmdbId,
            genres: movieData.genres || [],
            cast: movieData.cast || [],
            runtime: movieData.runtime,
          },
        })

        saved++
        if (saved % 10 === 0) {
          console.log(`Progress: ${saved}/${movies.length} movies saved...`)
        }
      } catch (error: any) {
        console.error(`Error saving ${movie.title}:`, error.message)
        errors++
        
        // If rate limited, wait longer
        if (error.response?.status === 429 || error.code === 'ECONNRESET') {
          console.log('Rate limited, waiting 15 seconds...')
          await new Promise(resolve => setTimeout(resolve, 15000))
        }
      }
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
    console.log('\nScript completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nScript failed:', error)
    process.exit(1)
  })
