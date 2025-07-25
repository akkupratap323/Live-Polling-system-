import { io } from 'socket.io-client'

let socket

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001')
  }
  return socket
}

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized. Call initSocket() first.')
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Socket event handlers
export const socketEvents = {
  // Teacher events
  joinTeacher: (socket) => {
    socket.emit('join-teacher')
  },

  createPoll: (socket, pollData) => {
    socket.emit('create-poll', pollData)
  },

  kickStudent: (socket, studentId) => {
    socket.emit('kick-student', studentId)
  },

  // Student events
  joinStudent: (socket, studentName) => {
    socket.emit('join-student', studentName)
  },

  submitAnswer: (socket, answer) => {
    socket.emit('submit-answer', answer)
  },

  // Chat events
  sendMessage: (socket, messageData) => {
    socket.emit('send-message', messageData)
  },

  getChatHistory: (socket) => {
    socket.emit('get-chat-history')
  }
}

// Socket listeners
export const socketListeners = {
  // Common listeners
  onConnect: (socket, callback) => {
    socket.on('connect', callback)
  },

  onDisconnect: (socket, callback) => {
    socket.on('disconnect', callback)
  },

  // Poll listeners
  onNewPoll: (socket, callback) => {
    socket.on('new-poll', callback)
  },

  onPollResults: (socket, callback) => {
    socket.on('poll-results', callback)
  },

  onPollClosed: (socket, callback) => {
    socket.on('poll-closed', callback)
  },

  onCurrentPoll: (socket, callback) => {
    socket.on('current-poll', callback)
  },

  onPollHistory: (socket, callback) => {
    socket.on('poll-history', callback)
  },

  // Student listeners
  onStudentsList: (socket, callback) => {
    socket.on('students-list', callback)
  },

  onStudentJoined: (socket, callback) => {
    socket.on('student-joined', callback)
  },

  onKicked: (socket, callback) => {
    socket.on('kicked', callback)
  },

  // Chat listeners
  onNewMessage: (socket, callback) => {
    socket.on('new-message', callback)
  },

  onChatHistory: (socket, callback) => {
    socket.on('chat-history', callback)
  },

  // Cleanup listeners
  removeAllListeners: (socket) => {
    socket.removeAllListeners()
  },

  removeListener: (socket, event, callback) => {
    socket.off(event, callback)
  }
}

export default {
  initSocket,
  getSocket,
  disconnectSocket,
  socketEvents,
  socketListeners
}
