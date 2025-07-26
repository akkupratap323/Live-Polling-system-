import { useState } from 'react'

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim())
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
        {/* Header with purple background */}
        <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center gap-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <span className="text-lg font-medium">Intervue Poll</span>
        </div>

        {/* Content */}
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Let's Get Started
          </h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            If you're a student, you'll be able to <strong>submit your answers</strong>, participate in live polls, and see how your responses compare with your classmates
          </p>

          {/* Name Input Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-lg font-medium text-gray-800 mb-3">
                Enter your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rahul Bajaj"
                className="w-full px-4 py-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors"
                required
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-colors text-lg"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
