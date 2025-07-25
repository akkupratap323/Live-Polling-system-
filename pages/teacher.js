import { useEffect, useState } from 'react'
import { initSocket, disconnectSocket } from '../lib/socket'
import TeacherDashboard from '../components/TeacherDashboard'

export default function Teacher() {
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const newSocket = initSocket()
    setSocket(newSocket)
    
    newSocket.emit('join-teacher')

    return () => {
      disconnectSocket()
    }
  }, [])

  if (!socket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Connecting...</div>
      </div>
    )
  }

  return <TeacherDashboard socket={socket} />
}
