import { useState, useEffect, useCallback } from 'react'
import PollResults from './PollResults'
import ChatPopup from './ChatPopup'

export default function StudentView({ socket, studentName }) {
  const [currentPoll, setCurrentPoll] = useState(null)
  const [hasAnswered, setHasAnswered] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [pollResults, setPollResults] = useState({ answers: {}, totalResponses: 0 })
  const [isConnected, setIsConnected] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Memoized submit function to prevent re-creation
  const submitAnswer = useCallback(() => {
    if (selectedAnswer && !hasAnswered && currentPoll && timeLeft > 0 && socket) {
      console.log('📝 Submitting answer:', selectedAnswer)
      socket.emit('submit-answer', selectedAnswer)
      setHasAnswered(true)
    }
  }, [selectedAnswer, hasAnswered, currentPoll, timeLeft, socket])

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Socket event listeners - STABLE useEffect
  useEffect(() => {
    if (!socket) return

    console.log('🔌 Setting up StudentView for:', studentName)

    const handleConnect = () => {
      console.log('✅ StudentView socket connected')
      setIsConnected(true)
    }

    const handleDisconnect = () => {
      console.log('❌ StudentView socket disconnected')
      setIsConnected(false)
    }

    const handleNewPoll = (poll) => {
      console.log('📋 StudentView received new poll:', poll)
      setCurrentPoll(poll)
      setHasAnswered(false)
      setSelectedAnswer('')
      setShowResults(false)
      
      const initialTime = poll.remainingTime !== undefined ? poll.remainingTime : poll.maxTime
      setTimeLeft(initialTime)
    }

    const handleTimerUpdate = ({ remaining }) => {
      setTimeLeft(remaining)
    }

    const handlePollResults = (results) => {
      console.log('📊 StudentView received results:', results)
      setPollResults(results)
      if (hasAnswered) {
        setShowResults(true)
      }
    }

    const handlePollClosed = (results) => {
      console.log('🔒 Poll closed for student')
      setPollResults(results)
      setShowResults(true)
      setCurrentPoll(null)
      setTimeLeft(0)
    }

    // Add event listeners
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('new-poll', handleNewPoll)
    socket.on('timer-update', handleTimerUpdate)
    socket.on('poll-results', handlePollResults)
    socket.on('poll-closed', handlePollClosed)

    // Cleanup function
    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('new-poll', handleNewPoll)
      socket.off('timer-update', handleTimerUpdate)
      socket.off('poll-results', handlePollResults)
      socket.off('poll-closed', handlePollClosed)
    }
  }, [socket, studentName, hasAnswered]) // Minimal dependencies

  // Loading state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Intervue Poll</h1>
          </div>
          <div className="mb-6">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
          <h2 className="text-xl font-medium text-gray-700">
            Connecting as {studentName}...
          </h2>
        </div>
      </div>
    )
  }

  // Waiting for poll
  if (!currentPoll && !showResults) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">Intervue Poll</h1>
          </div>
          <h2 className="text-xl font-medium text-gray-700">
            Wait for the teacher to ask questions..
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            Status: 🟢 Connected as {studentName}
          </p>
          
          <div className="mt-6">
            <button
              onClick={() => setShowChat(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
            >
              💬 Open Chat
            </button>
          </div>
        </div>
        
        {showChat && (
          <ChatPopup
            socket={socket}
            userType="student"
            userName={studentName}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    )
  }

  // Active poll interface
  if (currentPoll && !showResults) {
    const isTimeUp = timeLeft <= 0
    const canSubmit = selectedAnswer && !hasAnswered && !isTimeUp
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-medium">Question 1</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowChat(true)}
                className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
              >
                💬 Chat
              </button>
              <div className={`font-mono text-lg font-bold ${
                timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-white'
              }`}>
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-medium text-gray-800 mb-8">
              {currentPoll.question}
            </h3>

            {/* Status messages */}
            {isTimeUp && !hasAnswered && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                <p className="text-red-800 font-medium text-center">
                  ⏰ Time's up! Poll has ended.
                </p>
              </div>
            )}

            {hasAnswered && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                <p className="text-green-800 font-medium text-center">
                  ✅ Answer submitted: <strong>{selectedAnswer}</strong>
                </p>
              </div>
            )}

            {/* Options */}
            <div className="space-y-4 mb-8">
              {currentPoll.options.map((option, index) => (
                <label
                  key={`option-${index}`}
                  className={`flex items-center p-4 border-2 rounded-lg transition-colors ${
                    isTimeUp || hasAnswered 
                      ? 'cursor-not-allowed opacity-60' 
                      : 'cursor-pointer hover:border-gray-300'
                  } ${
                    selectedAnswer === option
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full border-2 mr-4 flex items-center justify-center font-medium ${
                    selectedAnswer === option
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <input
                    type="radio"
                    name="poll-option"
                    value={option}
                    checked={selectedAnswer === option}
                    onChange={(e) => setSelectedAnswer(e.target.value)}
                    disabled={isTimeUp || hasAnswered}
                    className="sr-only"
                  />
                  <span className="text-gray-700 flex-1 text-lg">{option}</span>
                </label>
              ))}
            </div>

            {/* Submit button */}
            <button
              onClick={submitAnswer}
              disabled={!canSubmit}
              className={`w-full py-4 px-6 rounded-lg font-medium text-lg transition-colors ${
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isTimeUp ? "Time's up!" : hasAnswered ? 'Answer Submitted ✓' : 'Submit'}
            </button>
          </div>
        </div>

        {showChat && (
          <ChatPopup
            socket={socket}
            userType="student"
            userName={studentName}
            onClose={() => setShowChat(false)}
          />
        )}
      </div>
    )
  }

  // Results screen
  if (showResults) {
    return (
      <>
        <PollResults results={pollResults} currentPoll={currentPoll} studentAnswer={selectedAnswer} />
        {showChat && (
          <ChatPopup
            socket={socket}
            userType="student"
            userName={studentName}
            onClose={() => setShowChat(false)}
          />
        )}
      </>
    )
  }

  return null
}
