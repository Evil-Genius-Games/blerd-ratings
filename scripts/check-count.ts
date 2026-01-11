import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function checkCount() {
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

    console.log(`\n📊 Current Movie Database Status:`)
    console.log(`   Total movies: ${count}`)
    console.log(`   With poster: ${withPoster}`)
    console.log(`   With description: ${withDescription}`)
    console.log(`   With cast: ${withCast}`)
    
    if (count >= 2000) {
      console.log(`\n🎉 SUCCESS! Reached ${count} movies!`)
    } else {
      console.log(`\n📈 Progress: ${((count / 2000) * 100).toFixed(1)}% (${count}/2000)`)
      console.log(`   Still need ${2000 - count} more movies`)
    }

    await prisma.$disconnect()
  } catch (error: any) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

checkCount()
