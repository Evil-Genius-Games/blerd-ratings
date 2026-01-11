'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export default function PopulatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string>('')
  const [result, setResult] = useState<any>(null)
  const [years, setYears] = useState(5)

  if (status === 'loading') {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </>
    )
  }

  if (status === 'unauthenticated') {
    router.push('/login')
    return null
  }

  const handlePopulate = async () => {
    setLoading(true)
    setProgress('Starting to scrape movies from the internet...')
    setResult(null)

    try {
      const response = await fetch('/api/movies/populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ years }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          ...data,
        })
        setProgress('')
      } else {
        setResult({
          success: false,
          error: data.error || data.message || 'Unknown error',
        })
        setProgress('')
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message || 'Failed to populate database',
      })
      setProgress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Populate Movie Database
          </h1>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              This will scrape the internet to find movies released in the last N years and add them to the database.
              This process may take a while (10-30 minutes) depending on how many years you select.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of years to scrape:
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={years}
                onChange={(e) => setYears(parseInt(e.target.value) || 5)}
                disabled={loading}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Will scrape movies from {new Date().getFullYear() - years} to {new Date().getFullYear()}
              </p>
            </div>

            <button
              onClick={handlePopulate}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Scraping...' : `Populate Database (Last ${years} Years)`}
            </button>
          </div>

          {progress && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-4 py-3 rounded mb-6">
              {progress}
            </div>
          )}

          {result && (
            <div
              className={`p-6 rounded-lg ${
                result.success
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
              }`}
            >
              {result.success ? (
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
                    Success!
                  </h3>
                  <p className="text-green-700 dark:text-green-300">
                    {result.message || 'Database populated successfully!'}
                  </p>
                  {result.total && (
                    <div className="mt-4 space-y-1 text-sm text-green-600 dark:text-green-400">
                      <p>Total movies found: {result.total}</p>
                      <p>Successfully saved: {result.saved}</p>
                      {result.skipped > 0 && <p>Skipped: {result.skipped}</p>}
                      {result.errors > 0 && <p>Errors: {result.errors}</p>}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
                    Error
                  </h3>
                  <p className="text-red-700 dark:text-red-300">{result.error}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded">
            <p className="font-semibold mb-2">Note:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>This process scrapes data from IMDb and may take 10-30 minutes</li>
              <li>Rate limiting is built in to avoid being blocked</li>
              <li>You can close this page - the process will continue on the server</li>
              <li>Make sure your database is running and accessible</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}
