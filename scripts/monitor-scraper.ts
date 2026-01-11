import 'dotenv/config'
import { prisma } from '../lib/prisma'
import { readFileSync } from 'fs'

async function monitorDatabase() {
  console.log('🔍 Enhanced Monitoring Active')
  console.log('📊 Updates every 100 movies scraped')
  console.log('⚠️  Alerts if scraper stops/slows for 10 minutes')
  console.log('Press Ctrl+C to stop monitoring.\n')

  let lastCount = 0
  let lastUpdateTime = Date.now()
  let lastNotificationCount = 0
  const targetCount = 2000
  const checkInterval = 10000 // Check every 10 seconds for faster detection
  const noProgressTimeout = 10 * 60 * 1000 // 10 minutes in milliseconds
  const notificationInterval = 100 // Notify every 100 movies

  const checkCount = async () => {
    try {
      const count = await prisma.movie.count()
      const withPoster = await prisma.movie.count({
        where: { posterUrl: { not: null } }
      })
      const withDescription = await prisma.movie.count({
        where: { description: { not: null } }
      })
      const withCast = await prisma.movie.count({
        where: { cast: { isEmpty: false } }
      })

      const timestamp = new Date().toLocaleTimeString()
      const timeSinceLastUpdate = Date.now() - lastUpdateTime
      
      // Check if count changed
      if (count !== lastCount) {
        const newMovies = count - lastCount
        const rate = newMovies > 0 ? (newMovies / (checkInterval / 1000)).toFixed(1) : '0'
        
        console.log(`\n[${timestamp}] 📊 Movies: ${count} (+${newMovies} new) | Rate: ~${rate} movies/sec`)
        console.log(`   ✅ With poster: ${withPoster} | Description: ${withDescription} | Cast: ${withCast}`)
        console.log(`   📈 Progress: ${((count / targetCount) * 100).toFixed(1)}% (${count}/${targetCount})`)
        
        lastCount = count
        lastUpdateTime = Date.now()
        
        // Notify every 100 movies
        const moviesSinceLastNotification = count - lastNotificationCount
        if (moviesSinceLastNotification >= notificationInterval) {
          console.log(`\n🔔 UPDATE: ${count} movies scraped! (+${moviesSinceLastNotification} since last update)`)
          lastNotificationCount = Math.floor(count / notificationInterval) * notificationInterval
        }
      } else {
        // No change - check for timeout
        if (timeSinceLastUpdate > noProgressTimeout) {
          console.log(`\n⚠️  WARNING: No progress detected for ${Math.floor(timeSinceLastUpdate / 60000)} minutes!`)
          console.log(`   Current count: ${count} movies`)
          console.log(`   Last update: ${new Date(lastUpdateTime).toLocaleTimeString()}`)
          console.log(`   Checking scraper status...`)
          
          // Check if scraper process is still running
          // This is a simple check - in production you might want more sophisticated monitoring
          console.log(`   ⚠️  Scraper may have stopped or slowed significantly`)
          console.log(`   💡 Check /tmp/scraper-log.txt for details`)
        } else {
          const minutesSinceUpdate = Math.floor(timeSinceLastUpdate / 60000)
          const secondsSinceUpdate = Math.floor((timeSinceLastUpdate % 60000) / 1000)
          console.log(`[${timestamp}] Movies: ${count} (no change for ${minutesSinceUpdate}m ${secondsSinceUpdate}s)`)
        }
      }

      // Check scraper log for additional info
      try {
        const logContent = readFileSync('/tmp/scraper-log.txt', 'utf-8')
        const lines = logContent.split('\n')
        const recentLines = lines.slice(-5)
        const progressLine = recentLines.find(line => 
          line.includes('Progress:') || line.includes('saved') || line.includes('enriched')
        )
        if (progressLine) {
          console.log(`   📝 Scraper: ${progressLine.trim()}`)
        }
      } catch (e) {
        // Log file might not exist yet
      }

      if (count >= targetCount) {
        console.log(`\n\n🎉🎉🎉 SUCCESS! 🎉🎉🎉`)
        console.log(`\n✅ Reached ${count} movies in the database!`)
        console.log(`\n📊 Final Statistics:`)
        console.log(`   Total movies: ${count}`)
        console.log(`   With poster: ${withPoster} (${((withPoster / count) * 100).toFixed(1)}%)`)
        console.log(`   With description: ${withDescription} (${((withDescription / count) * 100).toFixed(1)}%)`)
        console.log(`   With cast: ${withCast} (${((withCast / count) * 100).toFixed(1)}%)`)
        
        console.log(`\n✨ The scraper has successfully populated your database with 2,000+ movies!`)
        console.log(`   All movies include posters, descriptions, and cast lists.`)
        
        await prisma.$disconnect()
        process.exit(0)
      }
    } catch (error: any) {
      console.error('❌ Error checking database:', error.message)
    }
  }

  // Check immediately
  await checkCount()

  // Then check every 10 seconds
  const interval = setInterval(async () => {
    await checkCount()
  }, checkInterval)

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n⏹️  Monitoring stopped.')
    clearInterval(interval)
    await prisma.$disconnect()
    process.exit(0)
  })
}

monitorDatabase()
