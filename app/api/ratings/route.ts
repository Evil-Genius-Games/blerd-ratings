import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { movieId, diversityScore, inclusionScore, comment } = await request.json()

    if (!movieId || !diversityScore || !inclusionScore) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate scores are between 1 and 5
    if (diversityScore < 1 || diversityScore > 5 || inclusionScore < 1 || inclusionScore > 5) {
      return NextResponse.json(
        { error: 'Scores must be between 1 and 5' },
        { status: 400 }
      )
    }

    const overallScore = (diversityScore + inclusionScore) / 2

    const rating = await prisma.rating.upsert({
      where: {
        userId_movieId: {
          userId: session.user.id,
          movieId,
        },
      },
      update: {
        diversityScore,
        inclusionScore,
        overallScore,
        comment,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        movieId,
        diversityScore,
        inclusionScore,
        overallScore,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        movie: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return NextResponse.json({ success: true, rating })
  } catch (error) {
    console.error('Error creating/updating rating:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const searchParams = request.nextUrl.searchParams
    const movieId = searchParams.get('movieId')
    const userId = searchParams.get('userId') || session?.user?.id

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const where: { userId: string; movieId?: string } = { userId }
    if (movieId) {
      where.movieId = movieId
    }

    const ratings = await prisma.rating.findMany({
      where,
      include: {
        movie: {
          select: {
            id: true,
            title: true,
            posterUrl: true,
            releaseDate: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ ratings })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
