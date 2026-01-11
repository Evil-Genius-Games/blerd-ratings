import axios from 'axios'
import * as cheerio from 'cheerio'

export interface MovieData {
  title: string
  releaseDate?: Date
  director?: string
  description?: string
  posterUrl?: string
  imdbId?: string
  tmdbId?: number
  genres?: string[]
  cast?: string[]
  runtime?: number
}

/**
 * Scrapes movie data from IMDb
 */
export async function scrapeIMDb(imdbId: string): Promise<MovieData | null> {
  try {
    const url = `https://www.imdb.com/title/${imdbId}/`
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    const $ = cheerio.load(response.data)
    
    const title = $('h1[data-testid="hero-title-block__title"]').text().trim()
    const releaseDateText = $('a[href*="releaseinfo"]').first().text().trim()
    const director = $('a[href*="/name/"]').first().text().trim()
    const description = $('span[data-testid="plot-xl"]').text().trim() || 
                       $('span[data-testid="plot-l"]').text().trim()
    const posterUrl = $('img[data-testid="hero-image__poster"]').attr('src') || 
                     $('img.ipc-image').first().attr('src')
    
    // Extract genres
    const genres: string[] = []
    $('a[href*="/search/title?genres="]').each((_, el) => {
      const genre = $(el).text().trim()
      if (genre) genres.push(genre)
    })

    // Extract cast
    const cast: string[] = []
    $('a[data-testid="title-cast-item__actor"]').each((_, el) => {
      const actor = $(el).text().trim()
      if (actor) cast.push(actor)
    })

    // Extract runtime
    const runtimeText = $('li[data-testid="title-techspec_runtime"]').find('div').last().text().trim()
    const runtimeMatch = runtimeText.match(/(\d+)/)
    const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : undefined

    // Parse release date
    let releaseDate: Date | undefined
    if (releaseDateText) {
      const dateMatch = releaseDateText.match(/(\d{4})/)
      if (dateMatch) {
        releaseDate = new Date(parseInt(dateMatch[1]), 0, 1)
      }
    }

    return {
      title,
      releaseDate,
      director,
      description,
      posterUrl,
      imdbId,
      genres,
      cast,
      runtime,
    }
  } catch (error) {
    console.error('Error scraping IMDb:', error)
    return null
  }
}

/**
 * Searches for movies using TMDB API (requires API key)
 * Falls back to basic search if no API key
 */
export async function searchMovies(query: string, tmdbApiKey?: string): Promise<MovieData[]> {
  if (tmdbApiKey) {
    try {
      const response = await axios.get('https://api.themoviedb.org/3/search/movie', {
        params: {
          api_key: tmdbApiKey,
          query,
        }
      })

      return response.data.results.map((movie: any) => ({
        title: movie.title,
        releaseDate: movie.release_date ? new Date(movie.release_date) : undefined,
        description: movie.overview,
        posterUrl: movie.poster_path 
          ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
          : undefined,
        tmdbId: movie.id,
        genres: [], // Would need additional API call to get genres
      }))
    } catch (error) {
      console.error('Error searching TMDB:', error)
    }
  }

  // Fallback: return empty array or implement alternative search
  return []
}

/**
 * Scrapes recent movies from IMDb's "In Theaters" or "Coming Soon" pages
 */
export async function scrapeRecentMovies(): Promise<MovieData[]> {
  try {
    const urls = [
      'https://www.imdb.com/movies-in-theaters/',
      'https://www.imdb.com/movies-coming-soon/',
    ]

    const movies: MovieData[] = []

    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        const $ = cheerio.load(response.data)
        
        $('div.ipc-poster-card').each((_, el) => {
          const title = $(el).find('a[data-testid="ipc-poster-card-title"]').text().trim()
          const href = $(el).find('a[data-testid="ipc-poster-card-title"]').attr('href')
          const imdbIdMatch = href?.match(/\/title\/(tt\d+)/)
          const imdbId = imdbIdMatch ? imdbIdMatch[1] : undefined
          const posterUrl = $(el).find('img').attr('src')

          if (title && imdbId) {
            movies.push({
              title,
              imdbId,
              posterUrl,
            })
          }
        })
      } catch (error) {
        console.error(`Error scraping ${url}:`, error)
      }
    }

    return movies
  } catch (error) {
    console.error('Error scraping recent movies:', error)
    return []
  }
}
