import { useState, useEffect, useCallback } from 'react'
import ChatPopup from './ChatPopup'

export default function StudentView({ socket, studentName }) {
  const [currentPoll, setCurrentPoll] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [pollResults, setPollResults] = useState({ answers: {}, totalResponses: 0 })
  const [pollHistory, setPollHistory] = useState([])
  const [isConnected, setIsConnected] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  
  // Sidebar state
  const [showSidebar, setShowSidebar] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('participants')
  const [students, setStudents] = useState([])

  // Memoized functions
  const submitAnswer = useCallback(() => {
    if (selectedAnswer && !hasAnswered && currentPoll && timeLeft > 0 && socket) {
      socket.emit('submit-answer', selectedAnswer)
      setHasAnswered(true)
    }
  }, [selectedAnswer, hasAnswered, currentPoll, timeLeft, socket])

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }, [])

  const getPercentage = useCallback((count, total) => {
    return total > 0 ? Math.round((count / total) * 100) : 0
  }, [])

  // Toggle sidebar
  const toggleSidebar = (tab = null) => {
    if (tab) {
      setSidebarTab(tab)
      setShowSidebar(true)
    } else {
      setShowSidebar(!showSidebar)
    }
  }

  // Socket event listeners
  useEffect(() => {
    if (!socket) return

    const handleConnect = () => {
      setIsConnected(true)
      socket.emit('get-students-list')
    }

    const handleDisconnect = () => {
      setIsConnected(false)
    }

    const handleNewPoll = (poll) => {
      setCurrentPoll(poll)
      setHasAnswered(false)
      setSelectedAnswer('')
      setShowResults(false)
      setShowHistory(false)
      
      const initialTime = poll.remainingTime !== undefined ? poll.remainingTime : poll.maxTime
      setTimeLeft(initialTime)
    }

    const handleTimerUpdate = ({ remaining }) => {
      setTimeLeft(remaining)
    }

    const handlePollResults = (results) => {
      setPollResults(results)
      if (hasAnswered) {
        setShowResults(true)
      }
    }

    const handlePollClosed = (results) => {
      setPollResults(results)
      setShowResults(true)
      
      if (currentPoll) {
        const completedPoll = {
          ...currentPoll,
          results: results,
          completedAt: new Date().toISOString(),
          studentAnswer: selectedAnswer
        }
        setPollHistory(prev => [completedPoll, ...prev])
      }
      
      setCurrentPoll(null)
      setTimeLeft(0)
    }

    const handleStudentsList = (studentsList) => {
      if (Array.isArray(studentsList)) {
        setStudents(studentsList)
      } else {
        setStudents([])
      }
    }

    const handleStudentJoined = (student) => {
      setStudents(prev => {
        const exists = prev.find(s => s.id === student.id)
        if (!exists) {
          return [...prev, student]
        }
        return prev
      })
    }

    const handleStudentLeft = (studentId) => {
      setStudents(prev => prev.filter(s => s.id !== studentId))
    }

    // Add event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('new-poll', handleNewPoll)
    socket.on('timer-update', handleTimerUpdate)
    socket.on('poll-results', handlePollResults)
    socket.on('poll-closed', handlePollClosed)
    socket.on('students-list', handleStudentsList)
    socket.on('student-joined', handleStudentJoined)
    socket.on('student-left', handleStudentLeft)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('new-poll', handleNewPoll)
      socket.off('timer-update', handleTimerUpdate)
      socket.off('poll-results', handlePollResults)
      socket.off('poll-closed', handlePollClosed)
      socket.off('students-list', handleStudentsList)
      socket.off('student-joined', handleStudentJoined)
      socket.off('student-left', handleStudentLeft)
    }
  }, [socket, studentName, hasAnswered, currentPoll, selectedAnswer])

  // Loading state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-sm">
          <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center gap-3">
            <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <span className="text-base font-medium">Intervue Poll</span>
          </div>
          <div className="p-6 text-center">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-lg font-medium text-gray-800 mb-2">Connecting...</h2>
            <p className="text-sm text-gray-600">Welcome {studentName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Main container - Mobile optimized
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main content - Mobile first approach */}
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

        {/* Poll History View - Mobile optimized */}
        {showHistory && (
          <div className="p-4">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Poll History</h2>
              
              {pollHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-3xl mb-3">📊</div>
                  <p className="text-gray-500 text-sm">No polls completed yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pollHistory.map((poll, pollIndex) => (
                    <div key={poll.id || pollIndex} className="border rounded-lg overflow-hidden">
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
                            const isMyAnswer = option === poll.studentAnswer
                            
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
                                      {isMyAnswer && (
                                        <span className={`text-xs font-medium px-1 py-0.5 rounded flex-shrink-0 ${
                                          percentage > 25 ? 'bg-white bg-opacity-20 text-white' : 'bg-blue-100 text-blue-800'
                                        }`}>
                                          You
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
                            <strong>Total Responses:</strong> {poll.results.totalResponses}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Poll/Waiting View - Mobile optimized */}
        {!showHistory && (
          <>
            {/* Waiting for poll */}
            {!currentPoll && !showResults && (
              <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-sm">
                  <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center gap-3">
                    <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                    </div>
                    <span className="text-base font-medium">Intervue Poll</span>
                  </div>
                  <div className="p-6 text-center">
                    <h2 className="text-lg font-medium text-gray-800 mb-2">
                      Wait for the teacher to ask questions..
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                      🟢 Connected as {studentName}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Active poll interface - Mobile optimized */}
            {currentPoll && !showResults && (
              <div className="p-4">
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <span className="text-base font-medium">Question</span>
                    </div>
                    
                    <div className={`text-lg font-mono font-bold ${
                      timeLeft <= 10 ? 'animate-pulse' : ''
                    }`}>
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="bg-gray-800 text-white p-3 rounded-lg mb-4">
                      <h3 className="text-base font-medium">{currentPoll.question}</h3>
                    </div>

                    {/* Status messages */}
                    {timeLeft <= 0 && !hasAnswered && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded-lg mb-4">
                        <p className="text-red-800 font-medium text-center text-sm">
                          ⏰ Time's up! Poll has ended.
                        </p>
                      </div>
                    )}

                    {hasAnswered && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-4">
                        <p className="text-green-800 font-medium text-center text-sm">
                          ✅ Answer submitted: <strong>{selectedAnswer}</strong>
                        </p>
                      </div>
                    )}

                    {/* Options - Mobile optimized */}
                    <div className="space-y-3 mb-6">
                      {currentPoll.options.map((option, index) => {
                        const isTimeUp = timeLeft <= 0
                        const isSelected = selectedAnswer === option
                        
                        return (
                          <label
                            key={`option-${index}`}
                            className={`flex items-center p-3 border-2 rounded-lg transition-colors ${
                              isTimeUp || hasAnswered 
                                ? 'cursor-not-allowed opacity-60' 
                                : 'cursor-pointer hover:border-purple-300 active:bg-purple-50'
                            } ${
                              isSelected
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-full border-2 mr-3 flex items-center justify-center font-medium text-sm flex-shrink-0 ${
                              isSelected
                                ? 'border-purple-500 bg-purple-500 text-white'
                                : 'border-gray-300 text-gray-600'
                            }`}>
                              {index + 1}
                            </div>
                            <input
                              type="radio"
                              name="poll-option"
                              value={option}
                              checked={isSelected}
                              onChange={(e) => setSelectedAnswer(e.target.value)}
                              disabled={isTimeUp || hasAnswered}
                              className="sr-only"
                            />
                            <span className="text-gray-700 flex-1 text-base">{option}</span>
                          </label>
                        )
                      })}
                    </div>

                    {/* Submit button - Mobile optimized */}
                    <button
                      onClick={submitAnswer}
                      disabled={!selectedAnswer || hasAnswered || timeLeft <= 0}
                      className={`w-full py-3 px-4 rounded-lg font-medium text-base transition-colors ${
                        selectedAnswer && !hasAnswered && timeLeft > 0
                          ? 'bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {timeLeft <= 0 ? "Time's up!" : hasAnswered ? 'Answer Submitted ✓' : 'Submit'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results screen - Mobile optimized */}
            {showResults && (
              <div className="p-4">
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                  <div className="bg-green-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white bg-opacity-20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <span className="text-base font-medium">Results</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="bg-gray-800 text-white p-3 rounded-lg mb-4">
                      <h3 className="text-base font-medium">{currentPoll?.question || 'Poll Results'}</h3>
                    </div>

                    <div className="space-y-3">
                      {currentPoll?.options.map((option, index) => {
                        const count = pollResults.answers[option] || 0
                        const percentage = getPercentage(count, pollResults.totalResponses)
                        const isMyAnswer = option === selectedAnswer
                        
                        return (
                          <div key={index} className="relative">
                            <div className="relative overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                              <div 
                                className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-700 ease-out"
                                style={{ width: `${percentage}%` }}
                              />
                              
                              <div className="relative z-10 flex items-center justify-between p-3">
                                <div className="flex items-center space-x-2 flex-1 min-w-0">
                                  <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  
                                  <span className={`font-medium text-sm truncate ${
                                    percentage > 25 ? 'text-white' : 'text-gray-800'
                                  }`}>
                                    {option}
                                  </span>
                                  
                                  {isMyAnswer && (
                                    <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${
                                      percentage > 25 ? 'bg-white bg-opacity-20 text-white' : 'bg-blue-100 text-blue-800'
                                    }`}>
                                      You
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
                      <div className="text-sm text-blue-800 text-center">
                        <strong>Total Responses:</strong> {pollResults.totalResponses}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
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
                  <span className="font-medium text-sm">Class Activity</span>
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
                        Online Students ({students.length})
                      </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3">
                      <div className="space-y-2">
                        {students.length > 0 ? (
                          students.map(student => (
                            <div key={`student-${student.id}`} className="flex items-center p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  student.hasAnswered ? 'bg-green-500' : 'bg-yellow-500'
                                }`}></div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-800 truncate">
                                    {student.name}
                                    {student.name === studentName && (
                                      <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-1 py-0.5 rounded">You</span>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {student.hasAnswered ? '✅' : '⏳'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-6">
                            <div className="text-gray-400 text-2xl mb-2">👥</div>
                            <p className="text-gray-500 text-xs">No participants found</p>
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
                      userType="student"
                      userName={studentName}
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
