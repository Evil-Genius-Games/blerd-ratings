'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { Navbar } from '@/components/Navbar'
import Image from 'next/image'

interface Movie {
  id: string
  title: string
  releaseDate: string | null
  director: string | null
  description: string | null
  posterUrl: string | null
  genres: string[]
  cast: string[]
  runtime: number | null
  averageRatings: {
    diversity: number | null
    inclusion: number | null
    overall: number | null
    count: number
  }
  ratings: Array<{
    id: string
    diversityScore: number
    inclusionScore: number
    overallScore: number
    comment: string | null
    user: {
      id: string
      name: string | null
      image: string | null
    }
    createdAt: string
  }>
}

export default function MovieDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const movieId = params.id as string

  const [movie, setMovie] = useState<Movie | null>(null)
  const [loading, setLoading] = useState(true)
  const [diversityScore, setDiversityScore] = useState(3)
  const [inclusionScore, setInclusionScore] = useState(3)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [userRating, setUserRating] = useState<{
    diversityScore: number
    inclusionScore: number
    comment: string | null
  } | null>(null)

  useEffect(() => {
    fetchMovie()
    if (session?.user?.id) {
      fetchUserRating()
    }
  }, [movieId, session])

  const fetchMovie = async () => {
    try {
      const response = await fetch(`/api/movies/${movieId}`)
      if (!response.ok) {
        router.push('/movies')
        return
      }
      const data = await response.json()
      setMovie(data)
    } catch (error) {
      console.error('Error fetching movie:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRating = async () => {
    try {
      const response = await fetch(`/api/ratings?movieId=${movieId}`)
      const data = await response.json()
      if (data.ratings && data.ratings.length > 0) {
        const rating = data.ratings[0]
        setUserRating(rating)
        setDiversityScore(rating.diversityScore)
        setInclusionScore(rating.inclusionScore)
        setComment(rating.comment || '')
      }
    } catch (error) {
      console.error('Error fetching user rating:', error)
    }
  }

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      router.push('/login')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId,
          diversityScore,
          inclusionScore,
          comment: comment || null,
        }),
      })

      if (response.ok) {
        fetchMovie()
        fetchUserRating()
        alert('Rating submitted successfully!')
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </>
    )
  }

  if (!movie) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Movie not found</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              {movie.posterUrl ? (
                <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
                  <Image
                    src={movie.posterUrl}
                    alt={movie.title}
                    fill
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No Poster</span>
                </div>
              )}

              {movie.averageRatings.count > 0 && (
                <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                    Average Ratings
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Diversity</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {movie.averageRatings.diversity?.toFixed(1)}/5
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(movie.averageRatings.diversity! / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Inclusion</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {movie.averageRatings.inclusion?.toFixed(1)}/5
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${(movie.averageRatings.inclusion! / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="pt-2 text-sm text-gray-600 dark:text-gray-400">
                      Based on {movie.averageRatings.count} rating{movie.averageRatings.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                {movie.title}
              </h1>

              <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600 dark:text-gray-400">
                {movie.director && <span>Director: {movie.director}</span>}
                {movie.releaseDate && (
                  <span>Released: {new Date(movie.releaseDate).getFullYear()}</span>
                )}
                {movie.runtime && <span>Runtime: {movie.runtime} min</span>}
              </div>

              {movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {movie.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {movie.description && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Description</h2>
                  <p className="text-gray-700 dark:text-gray-300">{movie.description}</p>
                </div>
              )}

              {movie.cast.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Cast</h2>
                  <p className="text-gray-700 dark:text-gray-300">{movie.cast.join(', ')}</p>
                </div>
              )}

              {session && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                    {userRating ? 'Update Your Rating' : 'Rate This Movie'}
                  </h2>
                  <form onSubmit={handleSubmitRating} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Diversity Score: {diversityScore}/5
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={diversityScore}
                        onChange={(e) => setDiversityScore(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Inclusion Score: {inclusionScore}/5
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        step="0.5"
                        value={inclusionScore}
                        onChange={(e) => setInclusionScore(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Comment (optional)
                      </label>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
                    >
                      {submitting ? 'Submitting...' : userRating ? 'Update Rating' : 'Submit Rating'}
                    </button>
                  </form>
                </div>
              )}

              {!session && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded mb-8">
                  Please <a href="/login" className="underline">sign in</a> to rate this movie.
                </div>
              )}

              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  User Ratings ({movie.ratings.length})
                </h2>
                <div className="space-y-4">
                  {movie.ratings.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400">No ratings yet. Be the first to rate!</p>
                  ) : (
                    movie.ratings.map((rating) => (
                      <div
                        key={rating.id}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {rating.user.name || 'Anonymous'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(rating.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Diversity: {rating.diversityScore}/5
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Inclusion: {rating.inclusionScore}/5
                            </div>
                          </div>
                        </div>
                        {rating.comment && (
                          <p className="text-gray-700 dark:text-gray-300 mt-2">{rating.comment}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
