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
 * Scrapes movie data from IMDb with full details including poster, description, and cast
 */
export async function scrapeIMDb(imdbId: string): Promise<MovieData | null> {
  try {
    const url = `https://www.imdb.com/title/${imdbId}/`
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 30000,
    })

    const $ = cheerio.load(response.data)
    
    // Extract title
    const title = $('h1[data-testid="hero-title-block__title"]').text().trim() ||
                  $('h1.ipc-title__text').first().text().trim()
    
    // Extract release date
    const releaseDateText = $('a[href*="releaseinfo"]').first().text().trim() ||
                           $('span[data-testid="title-details-releasedate"]').find('a').first().text().trim()
    let releaseDate: Date | undefined
    if (releaseDateText) {
      const dateMatch = releaseDateText.match(/(\d{4})/)
      if (dateMatch) {
        releaseDate = new Date(parseInt(dateMatch[1]), 0, 1)
      }
    }

    // Extract director (try multiple selectors)
    const director = $('a[href*="/name/"][href*="/?ref_=tt_ov_dr"]').first().text().trim() ||
                    $('li[data-testid="title-pc-principal-credit"]').first().find('a').first().text().trim() ||
                    $('div.ipc-metadata-list-item__content-container').first().find('a').first().text().trim()
    
    // Extract description (plot/summary) - try multiple selectors
    const description = $('span[data-testid="plot-xl"]').text().trim() || 
                       $('span[data-testid="plot-l"]').text().trim() ||
                       $('span[data-testid="plot"]').text().trim() ||
                       $('div[data-testid="plot"]').find('span').first().text().trim() ||
                       $('.ipc-html-content-inner-div').first().text().trim()
    
    // Extract poster image - get high quality version
    let posterUrl = $('img[data-testid="hero-image__poster"]').attr('src') || 
                   $('img.ipc-image').first().attr('src')
    
    // Try to get higher quality poster from meta tags
    if (!posterUrl || posterUrl.includes('nopicture')) {
      posterUrl = $('meta[property="og:image"]').attr('content') ||
                 $('link[rel="image_src"]').attr('href')
    }
    
    // Convert to higher quality if it's a small thumbnail
    if (posterUrl) {
      // Replace thumbnail sizes with larger sizes
      posterUrl = posterUrl.replace(/._V1_.*\.jpg/, '._V1_SX3000.jpg')
                          .replace(/._V1_UX.*\.jpg/, '._V1_SX3000.jpg')
                          .replace(/._V1_UY.*\.jpg/, '._V1_SX3000.jpg')
    }
    
    // Extract genres
    const genres: string[] = []
    $('a[href*="/search/title?genres="]').each((_, el) => {
      const genre = $(el).text().trim()
      if (genre && !genres.includes(genre)) genres.push(genre)
    })
    
    // Also try alternative genre selectors
    if (genres.length === 0) {
      $('span[data-testid="storyline-genres"]').find('a').each((_, el) => {
        const genre = $(el).text().trim()
        if (genre && !genres.includes(genre)) genres.push(genre)
      })
    }

    // Extract cast (actors) - get top cast members
    const cast: string[] = []
    // Try the main cast section
    $('a[data-testid="title-cast-item__actor"]').each((_, el) => {
      const actor = $(el).text().trim()
      if (actor && !cast.includes(actor) && cast.length < 20) {
        cast.push(actor)
      }
    })
    
    // Also try alternative cast selectors if the first didn't work
    if (cast.length === 0) {
      $('div[data-testid="title-cast-item"]').each((_, el) => {
        const actor = $(el).find('a').first().text().trim()
        if (actor && !cast.includes(actor) && cast.length < 20) {
          cast.push(actor)
        }
      })
    }
    
    // Try the cast list section
    if (cast.length === 0) {
      $('table.cast_list').find('td.primary_photo + td a').each((_, el) => {
        const actor = $(el).text().trim()
        if (actor && !cast.includes(actor) && cast.length < 20) {
          cast.push(actor)
        }
      })
    }

    // Extract runtime
    const runtimeText = $('li[data-testid="title-techspec_runtime"]').find('div').last().text().trim() ||
                       $('time').attr('datetime')
    const runtimeMatch = runtimeText?.match(/(\d+)/)
    const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : undefined

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
  } catch (error: any) {
    console.error(`Error scraping IMDb ${imdbId}:`, error.message)
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

/**
 * Scrapes movies by year from IMDb's advanced search
 */
export async function scrapeMoviesByYear(year: number, maxPages: number = 10): Promise<MovieData[]> {
  const movies: MovieData[] = []
  
  try {
    for (let page = 1; page <= maxPages; page++) {
      try {
        // IMDb advanced search URL for movies by year
        const url = `https://www.imdb.com/search/title/?title_type=feature&release_date=${year}-01-01,${year}-12-31&sort=num_votes,desc&start=${(page - 1) * 50 + 1}`
        
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 30000,
        })

        const $ = cheerio.load(response.data)
        
        // Check if we've reached the end
        const results = $('div.lister-item')
        if (results.length === 0) {
          console.log(`No more results for year ${year}, page ${page}`)
          break
        }

        results.each((_, el) => {
          try {
            const titleElement = $(el).find('h3.lister-item-header a')
            const title = titleElement.text().trim()
            const href = titleElement.attr('href')
            const imdbIdMatch = href?.match(/\/title\/(tt\d+)/)
            const imdbId = imdbIdMatch ? imdbIdMatch[1] : undefined
            
            if (!title || !imdbId) return

            // Extract year
            const yearText = $(el).find('span.lister-item-year').text().trim()
            const yearMatch = yearText.match(/(\d{4})/)
            const releaseYear = yearMatch ? parseInt(yearMatch[1]) : year

            // Extract poster
            const posterUrl = $(el).find('img.loadlate').attr('loadlate') || 
                             $(el).find('img').attr('src')

            // Extract director
            const director = $(el).find('p.text-muted a').first().text().trim()

            // Extract genres
            const genres: string[] = []
            $(el).find('span.genre').text().split(',').forEach((g: string) => {
              const genre = g.trim()
              if (genre) genres.push(genre)
            })

            // Extract runtime
            const runtimeText = $(el).find('span.runtime').text().trim()
            const runtimeMatch = runtimeText.match(/(\d+)/)
            const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : undefined

            // Extract description
            const description = $(el).find('p.text-muted').last().text().trim()

            movies.push({
              title,
              imdbId,
              releaseDate: new Date(releaseYear, 0, 1),
              director,
              description,
              posterUrl,
              genres,
              runtime,
            })
          } catch (error) {
            console.error('Error parsing movie item:', error)
          }
        })

        console.log(`Scraped page ${page} for year ${year}: ${results.length} movies found`)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error: any) {
        console.error(`Error scraping year ${year}, page ${page}:`, error.message)
        // If we get rate limited or blocked, wait longer
        if (error.response?.status === 429 || error.code === 'ECONNRESET') {
          console.log('Rate limited, waiting 10 seconds...')
          await new Promise(resolve => setTimeout(resolve, 10000))
        } else {
          break // Stop trying pages if there's a different error
        }
      }
    }
  } catch (error) {
    console.error(`Error scraping movies for year ${year}:`, error)
  }

  return movies
}

/**
 * Scrapes movies from the last N years
 */
export async function scrapeMoviesLastNYears(years: number = 5): Promise<MovieData[]> {
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - years
  const allMovies: MovieData[] = []

  console.log(`Starting to scrape movies from ${startYear} to ${currentYear}`)

  for (let year = startYear; year <= currentYear; year++) {
    console.log(`\n=== Scraping movies from year ${year} ===`)
    const yearMovies = await scrapeMoviesByYear(year, 20) // Get up to 20 pages per year (1000 movies)
    allMovies.push(...yearMovies)
    console.log(`Found ${yearMovies.length} movies for year ${year}`)
    
    // Longer delay between years
    if (year < currentYear) {
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  console.log(`\nTotal movies scraped: ${allMovies.length}`)
  return allMovies
}
