import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { director: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [movies, total] = await Promise.all([
      prisma.movie.findMany({
        where,
        orderBy: { releaseDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          ratings: {
            select: {
              diversityScore: true,
              inclusionScore: true,
              overallScore: true,
            },
          },
        },
      }),
      prisma.movie.count({ where }),
    ])

    // Calculate average ratings for each movie
    const moviesWithRatings =       movies.map((movie: {
        id: string
        title: string
        releaseDate: Date | null
        director: string | null
        posterUrl: string | null
        ratings: Array<{ diversityScore: number; inclusionScore: number; overallScore: number }>
      }) => {
      const avgDiversity = movie.ratings.length > 0
        ? movie.ratings.reduce((sum: number, r: { diversityScore: number }) => sum + r.diversityScore, 0) / movie.ratings.length
        : null
      const avgInclusion = movie.ratings.length > 0
        ? movie.ratings.reduce((sum: number, r: { inclusionScore: number }) => sum + r.inclusionScore, 0) / movie.ratings.length
        : null
      const avgOverall = movie.ratings.length > 0
        ? movie.ratings.reduce((sum: number, r: { overallScore: number }) => sum + r.overallScore, 0) / movie.ratings.length
        : null

      return {
        ...movie,
        averageRatings: {
          diversity: avgDiversity,
          inclusion: avgInclusion,
          overall: avgOverall,
          count: movie.ratings.length,
        },
        ratings: undefined, // Remove detailed ratings from response
      }
    })

    return NextResponse.json({
      movies: moviesWithRatings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching movies:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
