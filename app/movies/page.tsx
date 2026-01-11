'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import Image from 'next/image'

interface Movie {
  id: string
  title: string
  releaseDate: string | null
  director: string | null
  posterUrl: string | null
  averageRatings: {
    diversity: number | null
    inclusion: number | null
    overall: number | null
    count: number
  }
}

export default function MoviesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scraping, setScraping] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated') {
      fetchMovies()
    }
  }, [status, router])

  const fetchMovies = async () => {
    try {
      const url = search
        ? `/api/movies?search=${encodeURIComponent(search)}`
        : '/api/movies'
      const response = await fetch(url)
      const data = await response.json()
      setMovies(data.movies || [])
    } catch (error) {
      console.error('Error fetching movies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScrapeRecent = async () => {
    setScraping(true)
    try {
      const response = await fetch('/api/movies/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recent' }),
      })
      const data = await response.json()
      if (data.success) {
        alert(`Successfully scraped ${data.count} movies!`)
        fetchMovies()
      }
    } catch (error) {
      console.error('Error scraping movies:', error)
      alert('Error scraping movies. Please try again.')
    } finally {
      setScraping(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Movies
            </h1>
            <button
              onClick={handleScrapeRecent}
              disabled={scraping}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {scraping ? 'Scraping...' : 'Scrape Recent Movies'}
            </button>
          </div>

          <div className="mb-6">
            <input
              type="text"
              placeholder="Search movies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchMovies()
                }
              }}
              className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <button
              onClick={fetchMovies}
              className="ml-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Search
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <Link
                key={movie.id}
                href={`/movies/${movie.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {movie.posterUrl ? (
                  <div className="relative w-full h-64">
                    <Image
                      src={movie.posterUrl}
                      alt={movie.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-64 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400">No Poster</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                    {movie.title}
                  </h3>
                  {movie.director && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {movie.director}
                    </p>
                  )}
                  {movie.averageRatings.count > 0 && (
                    <div className="mt-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Diversity: {movie.averageRatings.diversity?.toFixed(1)}/5
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Inclusion: {movie.averageRatings.inclusion?.toFixed(1)}/5
                      </div>
                      <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {movie.averageRatings.count} rating{movie.averageRatings.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {movies.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No movies found. Try scraping recent movies or search for a specific title.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
