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
    if (!studentName || socketRef.current || initializationRef.current) {
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

    newSocket.on('kicked', () => {
      console.log('⚠️ Student was kicked')
      // Clean up immediately
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      sessionStorage.removeItem('studentName')
      alert('You have been removed by the teacher')
      window.location.href = '/'
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
  }, [studentName]) // Only depend on studentName

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
