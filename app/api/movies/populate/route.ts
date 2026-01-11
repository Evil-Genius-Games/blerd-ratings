import { NextRequest, NextResponse } from 'next/server'
import { scrapeMoviesLastNYears, scrapeIMDb } from '@/lib/scraper'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { years = 5 } = await request.json()

    console.log(`Starting to populate database with movies from last ${years} years...`)

    // Scrape movies from the last N years
    // Try to use TMDB API if available, otherwise fall back to IMDb scraping
    const tmdbApiKey = process.env.TMDB_API_KEY
    const movies = await scrapeMoviesLastNYears(years, tmdbApiKey)
    
    console.log(`Found ${movies.length} movies. Saving to database...`)

    let saved = 0
    let skipped = 0
    let errors = 0

    // Process in batches to avoid overwhelming the database
    const batchSize = 10
    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(async (movie) => {
          if (!movie.imdbId) {
            skipped++
            return
          }

          try {
            // Always enrich with full details from IMDb to get poster, description, and cast
            let movieData = movie
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
            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1500))

            await prisma.movie.upsert({
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
          } catch (error: any) {
            console.error(`Error saving ${movie.title}:`, error.message)
            errors++
          }
        })
      )

      // Progress update
      if ((i + batchSize) % 50 === 0 || i + batchSize >= movies.length) {
        console.log(`Progress: ${Math.min(i + batchSize, movies.length)}/${movies.length} processed`)
      }

      // Delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return NextResponse.json({
      success: true,
      total: movies.length,
      saved,
      skipped,
      errors,
      message: `Successfully populated database with ${saved} movies from the last ${years} years`,
    })
  } catch (error: any) {
    console.error('Error populating database:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message 
      },
      { status: 500 }
    )
  }
}
