import { NextRequest, NextResponse } from 'next/server'
import { scrapeRecentMovies, scrapeIMDb } from '@/lib/scraper'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { action, imdbId } = await request.json()

    if (action === 'recent') {
      // Scrape recent movies
      const movies = await scrapeRecentMovies()
      
      // Save to database
      const savedMovies = []
      for (const movie of movies) {
        if (movie.imdbId) {
          try {
            const saved = await prisma.movie.upsert({
              where: { imdbId: movie.imdbId },
              update: {
                title: movie.title,
                posterUrl: movie.posterUrl,
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
            savedMovies.push(saved)
          } catch (error) {
            console.error(`Error saving movie ${movie.imdbId}:`, error)
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        count: savedMovies.length,
        movies: savedMovies 
      })
    }

    if (action === 'single' && imdbId) {
      // Scrape single movie by IMDb ID
      const movieData = await scrapeIMDb(imdbId)
      
      if (!movieData) {
        return NextResponse.json(
          { error: 'Failed to scrape movie data' },
          { status: 400 }
        )
      }

      const saved = await prisma.movie.upsert({
        where: { imdbId },
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

      return NextResponse.json({ success: true, movie: saved })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing imdbId' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in scrape route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
