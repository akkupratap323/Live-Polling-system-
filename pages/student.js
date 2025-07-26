import { useEffect, useState, useRef } from 'react'
import { io } from 'socket.io-client'
import StudentView from '../components/StudentView'
import NameModal from '../components/NameModal'

export default function Student() {
  const [socket, setSocket] = useState(null)
  const [studentName, setStudentName] = useState('')
  const [showNameModal, setShowNameModal] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isKicked, setIsKicked] = useState(false) // NEW: Kicked state
  
  // Use ref to prevent multiple socket creations
  const socketRef = useRef(null)
  const initializationRef = useRef(false)

  // Load saved name on mount (ONLY ONCE)
  useEffect(() => {
    if (!isInitialized) {
      console.log('🔄 Initial setup - checking saved name')
      const savedName = sessionStorage.getItem('studentName')
      if (savedName && savedName.trim()) {
        console.log('✅ Found saved name:', savedName)
        setStudentName(savedName.trim())
        setShowNameModal(false)
      } else {
        console.log('ℹ️ No saved name found')
      }
      setIsInitialized(true)
    }
  }, [isInitialized])

  // Create socket connection (ONLY WHEN NAME IS SET AND NO SOCKET EXISTS)
  useEffect(() => {
    // Prevent multiple initializations
    if (!studentName || socketRef.current || initializationRef.current || isKicked) {
      return
    }

    console.log('🔌 Creating socket connection for:', studentName)
    initializationRef.current = true

    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      timeout: 20000,
      forceNew: true,
      transports: ['websocket', 'polling']
    })
    
    newSocket.on('connect', () => {
      console.log('✅ Socket connected for student:', studentName)
      setConnectionError(false)
      newSocket.emit('join-student', studentName)
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      setConnectionError(true)
    })

    newSocket.on('student-connected', ({ success, name }) => {
      console.log('🎉 Student registration confirmed:', name)
    })

    // ENHANCED: Handle kicked event with proper UI state
    newSocket.on('kicked', () => {
      console.log('⚠️ Student was kicked')
      
      // Set kicked state to show the kicked page
      setIsKicked(true)
      
      // Clean up socket immediately
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      
      // Clear saved data
      sessionStorage.removeItem('studentName')
      
      // Don't redirect immediately - show the kicked page first
    })

    // Store socket reference
    socketRef.current = newSocket
    setSocket(newSocket)

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up socket connection')
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      initializationRef.current = false
    }
  }, [studentName, isKicked]) // Added isKicked to dependencies

  const handleNameSubmit = (name) => {
    const trimmedName = name.trim()
    if (trimmedName) {
      console.log('📝 Setting student name:', trimmedName)
      
      // Store in sessionStorage
      sessionStorage.setItem('studentName', trimmedName)
      
      // Update state
      setStudentName(trimmedName)
      setShowNameModal(false)
    }
  }

  // Handle going back to home after being kicked
  const handleBackToHome = () => {
    // Clear all data and redirect to home
    sessionStorage.clear()
    localStorage.clear()
    window.location.href = '/'
  }

  // NEW: Show kicked out page
  if (isKicked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          {/* Header */}
          <div className="bg-red-600 text-white p-4 rounded-t-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-lg font-medium">Intervue Poll</span>
          </div>
          
          {/* Content */}
          <div className="p-8 text-center">
            {/* Kicked Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              You've been Kicked out !
            </h2>
            
            {/* Message */}
            <p className="text-gray-600 mb-6">
              Looks like the teacher had removed you from the poll system. Please<br />
              Try again sometime.
            </p>
            
            {/* Single Action Button */}
            <button
              onClick={handleBackToHome}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium text-lg transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show name modal
  if (showNameModal) {
    return <NameModal onSubmit={handleNameSubmit} />
  }

  // Show connection error
  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-600 mb-2">
            Connection Failed
          </h2>
          <p className="text-gray-500 mb-4">
            Could not connect to the server.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Show loading while connecting
  if (!socket || !studentName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Connecting as {studentName}...
          </h2>
        </div>
      </div>
    )
  }

  // Render main student view
  return <StudentView socket={socket} studentName={studentName} />
}
