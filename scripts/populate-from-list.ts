import 'dotenv/config'
import { scrapeIMDb } from '../lib/scraper'
import { prisma } from '../lib/prisma'

// Popular movies from 2020-2024 with their IMDb IDs
const popularMovies = [
  // 2024
  'tt15398776', // Dune: Part Two
  'tt6166392',  // Wonka
  'tt11389872', // The Fall Guy
  'tt10676052', // Challengers
  'tt17009710', // Furiosa
  'tt6166392',  // Wonka
  'tt11389872', // The Fall Guy
  'tt10676052', // Challengers
  'tt17009710', // Furiosa
  'tt11389872', // The Fall Guy
  // 2023
  'tt15398776', // Oppenheimer
  'tt1517268',  // Barbie
  'tt9362722',  // Spider-Man: Across the Spider-Verse
  'tt13345606', // The Super Mario Bros. Movie
  'tt10366206', // John Wick: Chapter 4
  'tt16419074', // Air
  'tt10151854', // Creed III
  'tt10638522', // Scream VI
  'tt10366206', // John Wick: Chapter 4
  'tt16419074', // Air
  // 2022
  'tt10872600', // Spider-Man: No Way Home
  'tt9032400',  // Eternals
  'tt9114286',  // Black Widow
  'tt10872600', // Spider-Man: No Way Home
  'tt9032400',  // Eternals
  'tt9114286',  // Black Widow
  'tt10872600', // Spider-Man: No Way Home
  'tt9032400',  // Eternals
  'tt9114286',  // Black Widow
  // 2021
  'tt1160419',  // Dune
  'tt9376612',  // Shang-Chi
  'tt10872600', // No Time to Die
  'tt1160419',  // Dune
  'tt9376612',  // Shang-Chi
  'tt10872600', // No Time to Die
  // 2020
  'tt4154796',  // Avengers: Endgame (2019 but popular)
  'tt7286456',  // Joker
  'tt4154796',  // Avengers: Endgame
  'tt7286456',  // Joker
]

// More comprehensive list - removing duplicates
const uniqueMovieIds = Array.from(new Set(popularMovies))

async function populateFromList() {
  console.log(`Starting to populate database with ${uniqueMovieIds.length} popular movies...\n`)
  
  let saved = 0
  let errors = 0

  for (let i = 0; i < uniqueMovieIds.length; i++) {
    const imdbId = uniqueMovieIds[i]
    console.log(`\n[${i + 1}/${uniqueMovieIds.length}] Scraping IMDb ID: ${imdbId}`)
    
    try {
      const movieData = await scrapeIMDb(imdbId)
      
      if (!movieData) {
        console.log(`  ❌ Failed to scrape data for ${imdbId}`)
        errors++
        continue
      }

      console.log(`  ✓ Scraped: ${movieData.title}`)
      console.log(`    - Poster: ${movieData.posterUrl ? 'Yes' : 'No'}`)
      console.log(`    - Description: ${movieData.description ? 'Yes (' + movieData.description.substring(0, 50) + '...)' : 'No'}`)
      console.log(`    - Cast: ${movieData.cast ? movieData.cast.length + ' actors' : 'No'}`)

      const savedMovie = await prisma.movie.upsert({
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

      saved++
      console.log(`  ✅ Saved to database`)
      
      // Rate limiting - wait between requests
      await new Promise(resolve => setTimeout(resolve, 2000))
      
    } catch (error: any) {
      console.error(`  ❌ Error processing ${imdbId}:`, error.message)
      errors++
    }
  }

  console.log(`\n=== Population Complete ===`)
  console.log(`Total movies processed: ${uniqueMovieIds.length}`)
  console.log(`Successfully saved: ${saved}`)
  console.log(`Errors: ${errors}`)
  
  await prisma.$disconnect()
}

populateFromList()
  .then(() => {
    console.log('\nScript completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\nScript failed:', error)
    process.exit(1)
  })
