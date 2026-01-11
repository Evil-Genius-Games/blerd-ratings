import Link from 'next/link'
import { Navbar } from '@/components/Navbar'

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-6">
              Welcome to Blerd Ratings
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Rate movies based on diversity and inclusion. Share your perspective and help others discover films that represent diverse voices and stories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/movies"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                Browse Movies
              </Link>
              <Link
                href="/register"
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-purple-600 dark:text-purple-400 px-8 py-3 rounded-lg text-lg font-medium border-2 border-purple-600 dark:border-purple-400 transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4">🎬</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Rate Movies
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Rate movies on their diversity and inclusion representation. Your voice matters.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Discover Films
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Find movies that celebrate diversity and inclusion based on community ratings.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <div className="text-3xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Share Reviews
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Read and write reviews to help others make informed viewing decisions.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
