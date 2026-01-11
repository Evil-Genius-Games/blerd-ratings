import { scrapeMoviesLastNYears, scrapeIMDb } from '../lib/scraper'
import { prisma } from '../lib/prisma'

async function populateDatabase() {
  console.log('Starting movie database population...\n')
  
  try {
    // Scrape movies from the last 5 years
    const movies = await scrapeMoviesLastNYears(5)
    
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
        // If we only have basic info, enrich with full details
        let movieData = movie
        if (!movie.description || !movie.director || !movie.cast) {
          console.log(`Enriching ${movie.title}...`)
          const enriched = await scrapeIMDb(movie.imdbId)
          if (enriched) {
            movieData = {
              ...movie,
              ...enriched,
              // Keep original data if enriched doesn't have it
              title: enriched.title || movie.title,
              releaseDate: enriched.releaseDate || movie.releaseDate,
            }
          }
          // Delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1500))
        }

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
