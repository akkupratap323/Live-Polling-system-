import { useState, useEffect } from 'react'
import ChatPopup from './ChatPopup'

export default function TeacherDashboard({ socket }) {
  const [currentPoll, setCurrentPoll] = useState(null)
  const [students, setStudents] = useState([])
  const [pollHistory, setPollHistory] = useState([])
  const [showCreatePoll, setShowCreatePoll] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [pollResults, setPollResults] = useState({ answers: {}, totalResponses: 0, poll: null })
  const [showHistory, setShowHistory] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  
  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('participants')
  
  // Poll structure
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    maxTime: 60
  })

  // Socket handlers
  useEffect(() => {
    if (!socket) return

    socket.on('connect', () => {
      setConnectionStatus('Connected')
      socket.emit('join-teacher')
    })

    socket.on('students-list', (studentsList) => {
      setStudents(Array.isArray(studentsList) ? studentsList : [])
    })

    socket.on('student-joined', (student) => {
      setStudents(prev => {
        const exists = prev.find(s => s.id === student.id)
        if (!exists) {
          return [...prev, student]
        }
        return prev
      })
    })

    socket.on('poll-created', (poll) => {
      setCurrentPoll(poll)
      setShowResults(true)
      setTimeLeft(poll.maxTime)
      setPollResults({ answers: {}, totalResponses: 0, poll })
    })

    socket.on('poll-results', (results) => {
      setPollResults(results)
    })

    socket.on('timer-update', (time) => {
      setTimeLeft(time)
    })

    socket.on('poll-ended', () => {
      setTimeLeft(0)
      if (currentPoll && pollResults) {
        const completedPoll = {
          ...currentPoll,
          results: pollResults,
          completedAt: new Date().toISOString(),
          totalParticipants: students.length
        }
        setPollHistory(prev => [completedPoll, ...prev])
      }
    })

    return () => {
      socket.off('connect')
      socket.off('students-list')
      socket.off('student-joined')
      socket.off('poll-created')
      socket.off('poll-results')
      socket.off('timer-update')
      socket.off('poll-ended')
    }
  }, [socket, currentPoll, pollResults, students.length])

  const handleCreatePoll = (e) => {
    e.preventDefault()
    
    const validOptions = newPoll.options.filter(opt => opt.text.trim())
    const correctAnswers = validOptions.filter(opt => opt.isCorrect)
    
    if (!newPoll.question.trim()) {
      return
    }
    
    if (validOptions.length < 2) {
      return
    }
    
    if (correctAnswers.length === 0) {
      return
    }

    const pollData = {
      question: newPoll.question,
      options: validOptions.map(opt => opt.text),
      correctAnswers: correctAnswers.map(opt => opt.text),
      correctAnswer: correctAnswers[0].text,
      maxTime: newPoll.maxTime,
      id: Date.now(),
      createdAt: new Date().toISOString()
    }
    
    socket.emit('create-poll', pollData)
    
    setCurrentPoll(pollData)
    setShowCreatePoll(false)
    setShowResults(true)
    setTimeLeft(pollData.maxTime)
    
    setNewPoll({ 
      question: '', 
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      maxTime: 60 
    })
  }

  const createNextPoll = () => {
    if (currentPoll && pollResults) {
      const completedPoll = {
        ...currentPoll,
        results: pollResults,
        completedAt: new Date().toISOString(),
        totalParticipants: students.length
      }
      setPollHistory(prev => [completedPoll, ...prev])
    }
    
    setShowCreatePoll(true)
    setShowResults(false)
    setCurrentPoll(null)
    setPollResults({ answers: {}, totalResponses: 0, poll: null })
    setShowHistory(false)
  }

  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }))
  }

  const removeOption = (index) => {
    if (newPoll.options.length <= 2) {
      alert('❌ You need at least 2 options!')
      return
    }
    
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const updateOptionText = (index, text) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, text } : opt
      )
    }))
  }

  const updateOptionCorrectness = (index, isCorrect) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, isCorrect } : opt
      )
    }))
  }

  const kickStudent = (studentId) => {
    socket.emit('kick-student', studentId)
    setStudents(prev => prev.filter(s => s.id !== studentId))
  }

  const getPercentage = (count, total) => {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const toggleSidebar = (tab = null) => {
    if (tab) {
      setSidebarTab(tab)
      setShowSidebar(true)
    } else {
      setShowSidebar(!showSidebar)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Connection Status - Mobile optimized */}
      

      {/* Main container - Mobile first */}
      <div className={`transition-all duration-300 ${showSidebar ? 'lg:pr-80' : 'pr-0'}`}>
        {/* Navigation Tabs - Mobile optimized */}
        {(currentPoll || pollHistory.length > 0) && (
          <div className="bg-white border-b sticky top-0 z-30">
            <div className="px-4 py-2">
              <div className="flex space-x-1">
                <button
                  onClick={() => setShowHistory(false)}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    !showHistory 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Current Poll
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className={`px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    showHistory 
                      ? 'bg-purple-100 text-purple-600' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  History ({pollHistory.length})
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            
            {/* Poll History View - Mobile optimized */}
            {showHistory && (
              <div>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">Poll History</h2>
                  <button
                    onClick={createNextPoll}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
                  >
                    ➕ Create New Poll
                  </button>
                </div>

                {pollHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-3xl mb-3">📊</div>
                    <p className="text-gray-500 text-sm">No polls completed yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pollHistory.map((poll, pollIndex) => (
                      <div key={poll.id} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 border-b">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                            <h3 className="font-medium text-gray-800 text-sm">
                              Poll #{pollHistory.length - pollIndex}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {formatDate(poll.completedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="bg-gray-800 text-white p-3 rounded-lg mb-3">
                            <p className="font-medium text-sm">{poll.question}</p>
                          </div>

                          <div className="space-y-2">
                            {poll.options.map((option, index) => {
                              const count = poll.results.answers[option] || 0
                              const percentage = getPercentage(count, poll.results.totalResponses)
                              const isCorrect = poll.correctAnswers?.includes(option) || option === poll.correctAnswer
                              
                              return (
                                <div key={index} className="relative">
                                  <div className="relative overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                                    <div 
                                      className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                    
                                    <div className="relative z-10 flex items-center justify-between p-2">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <div className="w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                          {index + 1}
                                        </div>
                                        <span className={`font-medium text-xs truncate ${
                                          percentage > 25 ? 'text-white' : 'text-gray-800'
                                        }`}>
                                          {option}
                                        </span>
                                        {isCorrect && (
                                          <span className={`text-xs font-medium flex-shrink-0 ${
                                            percentage > 25 ? 'text-white' : 'text-green-600'
                                          }`}>
                                            ✓
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center space-x-1 flex-shrink-0">
                                        <span className={`font-bold text-xs ${
                                          percentage > 25 ? 'text-white' : 'text-gray-800'
                                        }`}>
                                          {percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="text-xs text-blue-800 text-center">
                              <strong>Total:</strong> {poll.results.totalResponses} • <strong>Rate:</strong> {poll.totalParticipants > 0 ? Math.round((poll.results.totalResponses / poll.totalParticipants) * 100) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Current Poll/Create Poll View */}
            {!showHistory && (
              <>
                {/* Create Poll Button */}
                {!showCreatePoll && !currentPoll && (
                  <div className="text-center py-8">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">Let's Get Started</h2>
                    <p className="text-gray-600 mb-6 text-sm sm:text-base">Create and manage polls, ask questions, and monitor responses in real-time.</p>
                    <button
                      onClick={() => setShowCreatePoll(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium text-base flex items-center gap-2 mx-auto"
                    >
                      <span className="text-lg">📊</span>
                      Intervue Poll
                    </button>
                  </div>
                )}

                {/* Mobile-optimized Poll Creation Form */}
                {showCreatePoll && (
                  <div className="w-full">
                    <div className="bg-purple-600 text-white p-3 rounded-t-lg flex items-center gap-2">
                      <span className="text-lg">📊</span>
                      <span className="font-medium text-sm">Intervue Poll</span>
                    </div>
                    
                    <div className="bg-white border-x border-b rounded-b-lg p-4">
                      <h2 className="text-xl font-bold text-gray-800 mb-4">Let's Get Started</h2>
                      <p className="text-gray-600 mb-6 text-sm">Create and manage polls, ask questions, and monitor responses.</p>
                      
                      <form onSubmit={handleCreatePoll} className="space-y-4">
                        {/* Question Input */}
                        <div>
                          <label className="block text-base font-medium text-gray-800 mb-2">Enter your question</label>
                          <div className="relative">
                            <textarea
                              value={newPoll.question}
                              onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                              placeholder="Which planet is known as the Red Planet?"
                              className="w-full p-3 text-base border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                              rows="3"
                              maxLength={100}
                              required
                            />
                            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                              {newPoll.question.length}/100
                            </div>
                          </div>
                        </div>

                        {/* Timer Selection */}
                        <div className="flex items-center justify-between">
                          <span className="text-base font-medium text-gray-800">Timer</span>
                          <select
                            value={newPoll.maxTime}
                            onChange={(e) => setNewPoll(prev => ({ ...prev, maxTime: parseInt(e.target.value) }))}
                            className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 text-sm"
                          >
                            <option value={15}>15 seconds</option>
                            <option value={30}>30 seconds</option>
                            <option value={60}>60 seconds</option>
                            <option value={120}>2 minutes</option>
                          </select>
                        </div>

                        {/* Options Section - Mobile optimized */}
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-medium text-gray-800">Edit Options</h3>
                            <span className="text-sm font-medium text-gray-800">Correct?</span>
                          </div>

                          <div className="space-y-3">
                            {newPoll.options.map((option, index) => (
                              <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                {/* Option Number */}
                                <div className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-medium text-sm flex-shrink-0">
                                  {index + 1}
                                </div>

                                {/* Option Input */}
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(e) => updateOptionText(index, e.target.value)}
                                    placeholder={['Mars', 'Venus', 'Jupiter', 'Saturn'][index] || `Option ${index + 1}`}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-sm"
                                  />
                                </div>

                                {/* Correct/Incorrect Radio Buttons */}
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct-${index}`}
                                      checked={option.isCorrect === true}
                                      onChange={() => updateOptionCorrectness(index, true)}
                                      className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-medium text-gray-700">Yes</span>
                                  </label>
                                  
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`correct-${index}`}
                                      checked={option.isCorrect === false}
                                      onChange={() => updateOptionCorrectness(index, false)}
                                      className="w-3 h-3 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="text-xs font-medium text-gray-700">No</span>
                                  </label>

                                  {/* Remove Option Button */}
                                  {newPoll.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(index)}
                                      className="text-red-600 hover:text-red-800 p-1"
                                      title="Remove option"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Add Option Button */}
                          <button
                            type="button"
                            onClick={addOption}
                            className="mt-3 w-full border-2 border-dashed border-purple-300 text-purple-600 hover:border-purple-400 hover:text-purple-700 py-2 px-3 rounded-lg font-medium transition-colors text-sm"
                          >
                            + Add More Option
                          </button>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4">
                          <button
                            type="submit"
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium text-base transition-colors"
                          >
                            🚀 Start Poll
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowCreatePoll(false)}
                            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-4 rounded-lg font-medium text-base transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Active Poll Display - Mobile optimized */}
                {currentPoll && showResults && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">Current Poll</h2>
                      <button
                        onClick={createNextPoll}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        ➕ Create New Poll
                      </button>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                      <div className="bg-purple-600 text-white p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                            </svg>
                          </div>
                          <span className="text-base font-medium">Question</span>
                        </div>
                        
                        {timeLeft > 0 && (
                          <div className={`text-lg font-mono font-bold ${
                            timeLeft <= 10 ? 'animate-pulse' : ''
                          }`}>
                            {formatTime(timeLeft)}
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="bg-gray-800 text-white p-3 rounded-lg mb-4">
                          <h3 className="text-base font-medium">{currentPoll.question}</h3>
                        </div>

                        <div className="space-y-3">
                          {currentPoll.options.map((option, index) => {
                            const count = pollResults.answers[option] || 0
                            const percentage = getPercentage(count, pollResults.totalResponses)
                            const isCorrect = currentPoll.correctAnswers?.includes(option) || option === currentPoll.correctAnswer
                            
                            return (
                              <div key={`option-${index}-${count}`} className="relative">
                                <div className="relative overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                                  <div 
                                    className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-700 ease-out"
                                    style={{ width: `${percentage}%` }}
                                  />
                                  
                                  <div className="relative z-10 flex items-center justify-between p-3">
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {index + 1}
                                      </div>
                                      
                                      <span className={`font-medium text-sm truncate ${
                                        percentage > 25 ? 'text-white' : 'text-gray-800'
                                      }`}>
                                        {option}
                                      </span>
                                      
                                      {isCorrect && (
                                        <span className={`text-xs font-medium flex-shrink-0 ${
                                          percentage > 25 ? 'text-white' : 'text-green-600'
                                        }`}>
                                          ✓
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                      <span className={`font-bold text-base ${
                                        percentage > 25 ? 'text-white' : 'text-gray-800'
                                      }`}>
                                        {percentage}%
                                      </span>
                                      <span className={`text-xs ${
                                        percentage > 25 ? 'text-white opacity-80' : 'text-gray-500'
                                      }`}>
                                        ({count})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs sm:text-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 gap-1">
                              <span className="text-blue-800">
                                <strong>Responses:</strong> {students.filter(s => s.hasAnswered).length} / {students.length}
                              </span>
                              <span className="text-blue-800">
                                <strong>Total:</strong> {pollResults.totalResponses}
                              </span>
                            </div>
                            
                            <div className="text-blue-600 font-medium">
                              {students.length > 0 ? Math.round((students.filter(s => s.hasAnswered).length / students.length) * 100) : 0}% Complete
                            </div>
                          </div>
                          
                          <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                            <div 
                              className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                              style={{ 
                                width: `${students.length > 0 ? (students.filter(s => s.hasAnswered).length / students.length) * 100 : 0}%` 
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row gap-3">
                          {timeLeft === 0 && (
                            <>
                              <button
                                onClick={createNextPoll}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                              >
                                ➕ Create Next Question
                              </button>
                              
                              <button
                                onClick={() => setShowHistory(true)}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                              >
                                📊 View All Polls
                              </button>
                            </>
                          )}
                          
                          {timeLeft > 0 && (
                            <button
                              onClick={() => {
                                if (confirm('⚠️ Are you sure you want to end this poll early?')) {
                                  socket.emit('force-end-poll')
                                  setTimeLeft(0)
                                }
                              }}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                              ⏹️ End Poll Early
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile-optimized Sidebar */}
      {showSidebar && (
        <div className={`fixed inset-0 z-50 lg:right-0 lg:left-auto lg:w-80 ${showSidebar ? 'block' : 'hidden'}`}>
          {/* Mobile overlay */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 lg:hidden" 
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Sidebar content */}
          <div className="absolute right-0 top-0 h-full w-80 max-w-full bg-white shadow-2xl border-l">
            <div className="h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="font-medium text-sm">Class Management</span>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-white hover:text-gray-200 p-1 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="border-b bg-gray-50">
                <div className="flex">
                  <button
                    onClick={() => setSidebarTab('participants')}
                    className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                      sidebarTab === 'participants'
                        ? 'border-purple-600 text-purple-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>Participants</span>
                      <span className="bg-purple-100 text-purple-800 px-1 py-0.5 rounded-full text-xs font-medium">
                        {students.length}
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setSidebarTab('chat')}
                    className={`flex-1 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                      sidebarTab === 'chat'
                        ? 'border-purple-600 text-purple-600 bg-white'
                        : 'border-transparent text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Chat</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-hidden bg-white">
                {/* Participants Tab */}
                {sidebarTab === 'participants' && (
                  <div className="h-full flex flex-col">
                    <div className="p-3 border-b bg-gray-50">
                      <h3 className="text-xs font-medium text-gray-800">
                        Students Online ({students.length})
                      </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3">
                      <div className="space-y-2">
                        {students.length > 0 ? (
                          students.map(student => (
                            <div key={`student-${student.id}`} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  student.hasAnswered ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-800 truncate">
                                    {student.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {student.hasAnswered ? '✅' : '⏳'}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => kickStudent(student.id)}
                                className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 flex-shrink-0"
                              >
                                Kick
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <div className="text-gray-400 text-2xl mb-2">👥</div>
                            <p className="text-gray-500 text-xs">No students online</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Tab */}
                {sidebarTab === 'chat' && (
                  <div className="h-full">
                    <ChatPopup
                      socket={socket}
                      userType="teacher"
                      userName="Teacher"
                      isEmbedded={true}
                      onClose={() => setSidebarTab('participants')}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile-optimized Floating Action Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => toggleSidebar()}
          className="w-12 h-12 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 transform active:scale-95"
          title={showSidebar ? "Close" : "Open Chat & Participants"}
        >
          {showSidebar ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
