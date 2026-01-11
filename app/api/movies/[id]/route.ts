import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        ratings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!movie) {
      return NextResponse.json(
        { error: 'Movie not found' },
        { status: 404 }
      )
    }

    // Calculate average ratings
    const avgDiversity = movie.ratings.length > 0
      ? movie.ratings.reduce((sum: number, r: { diversityScore: number }) => sum + r.diversityScore, 0) / movie.ratings.length
      : null
    const avgInclusion = movie.ratings.length > 0
      ? movie.ratings.reduce((sum: number, r: { inclusionScore: number }) => sum + r.inclusionScore, 0) / movie.ratings.length
      : null
    const avgOverall = movie.ratings.length > 0
      ? movie.ratings.reduce((sum: number, r: { overallScore: number }) => sum + r.overallScore, 0) / movie.ratings.length
      : null

    return NextResponse.json({
      ...movie,
      averageRatings: {
        diversity: avgDiversity,
        inclusion: avgInclusion,
        overall: avgOverall,
        count: movie.ratings.length,
      },
    })
  } catch (error) {
    console.error('Error fetching movie:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
