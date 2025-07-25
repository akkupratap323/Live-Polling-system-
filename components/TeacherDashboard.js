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
  const [showChat, setShowChat] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')
  
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: '',
    maxTime: 15
  })

// In components/TeacherDashboard.js, make sure you have this exact useEffect:
useEffect(() => {
  if (!socket) return

  console.log('🔌 Setting up teacher dashboard');

  socket.on('connect', () => {
    console.log('✅ Teacher connected, requesting join');
    setConnectionStatus('Connected');
    // Force join teacher room
    socket.emit('join-teacher');
  });

  // CRITICAL: Proper students list handler
  socket.on('students-list', (studentsList) => {
    console.log('👥 Teacher received students update:', studentsList);
    console.log('📊 Number of students:', studentsList ? studentsList.length : 0);
    setStudents(Array.isArray(studentsList) ? studentsList : []);
  });

  socket.on('student-joined', (student) => {
    console.log('👋 Individual student joined notification:', student);
    // Force update students list
    setStudents(prev => {
      const exists = prev.find(s => s.id === student.id);
      if (!exists) {
        console.log('➕ Adding new student to list:', student.name);
        return [...prev, student];
      }
      return prev;
    });
  });

  // Other event handlers...

  return () => {
    socket.off('connect');
    socket.off('students-list');
    socket.off('student-joined');
    // Other cleanup...
  };
}, [socket]);


  const handleCreatePoll = (e) => {
    e.preventDefault();
    const validOptions = newPoll.options.filter(opt => opt.trim());
    
    if (newPoll.question && validOptions.length >= 2 && newPoll.correctAnswer) {
      const pollData = {
        ...newPoll,
        options: validOptions,
        id: Date.now()
      };
      
      console.log('🎯 Creating poll:', pollData);
      socket.emit('create-poll', pollData);
      
      // Update UI immediately
      setShowCreatePoll(false);
      setShowResults(true);
      setTimeLeft(pollData.maxTime);
      
      // Reset form
      setNewPoll({ 
        question: '', 
        options: ['', '', '', ''], 
        correctAnswer: '', 
        maxTime: 15 
      });
    } else {
      alert('❌ Please fill all fields and select correct answer!');
    }
  };

  const kickStudent = (studentId) => {
    if (confirm('⚠️ Kick this student?')) {
      socket.emit('kick-student', studentId);
      setStudents(prev => prev.filter(s => s.id !== studentId));
    }
  };

  const getPercentage = (count, total) => {
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const updateOption = (index, value) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Connection Status */}
      <div className="mb-4 text-center">
        <span className={`px-3 py-1 rounded-full text-sm ${
          connectionStatus === 'Connected' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {connectionStatus} • Students: {students.length}
        </span>
      </div>

      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              
              {/* Create Poll Button */}
              {!showCreatePoll && !currentPoll && (
                <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-gray-800 mb-4">Question</h2>
                  <button
                    onClick={() => setShowCreatePoll(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium text-lg"
                  >
                    + Ask a new question
                  </button>
                </div>
              )}

              {/* Poll Creation Form */}
              {showCreatePoll && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-6">Create New Question</h2>
                  <form onSubmit={handleCreatePoll} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
                      <input
                        type="text"
                        value={newPoll.question}
                        onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                        placeholder="Which planet is known as the Red Planet?"
                        className="w-full p-4 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                      <div className="grid grid-cols-2 gap-4">
                        {newPoll.options.map((option, index) => (
                          <input
                            key={index}
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            placeholder={['Mars', 'Venus', 'Jupiter', 'Saturn'][index] || `Option ${index + 1}`}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                      <select
                        value={newPoll.correctAnswer}
                        onChange={(e) => setNewPoll(prev => ({ ...prev, correctAnswer: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                        required
                      >
                        <option value="">Select correct answer...</option>
                        {newPoll.options.filter(opt => opt.trim()).map((option, index) => (
                          <option key={index} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Timer</label>
                      <select
                        value={newPoll.maxTime}
                        onChange={(e) => setNewPoll(prev => ({ ...prev, maxTime: parseInt(e.target.value) }))}
                        className="w-full p-3 border border-gray-300 rounded-lg"
                      >
                        <option value={15}>00:15</option>
                        <option value={30}>00:30</option>
                        <option value={60}>01:00</option>
                      </select>
                    </div>
                    
                    <div className="flex space-x-4">
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium"
                      >
                        🚀 Start Poll
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreatePoll(false)}
                        className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-3 px-6 rounded-lg font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Active Poll Display */}
              {currentPoll && showResults && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Live Question</h2>
                    {timeLeft > 0 && (
                      <div className={`text-2xl font-mono font-bold ${
                        timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600'
                      }`}>
                        {formatTime(timeLeft)}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">
                    <h3 className="text-lg">{currentPoll.question}</h3>
                  </div>

                  {/* Live Results */}
                  <div className="space-y-4">
                    {currentPoll.options.map((option, index) => {
                      const count = pollResults.answers[option] || 0;
                      const percentage = getPercentage(count, pollResults.totalResponses);
                      const isCorrect = option === currentPoll.correctAnswer;
                      
                      return (
                        <div key={`option-${index}-${count}`} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                {index + 1}
                              </div>
                              <span className="text-gray-800 font-medium">{option}</span>
                              {isCorrect && (
                                <span className="text-green-600 text-sm font-medium">✓ Correct</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600 font-bold text-lg">{percentage}%</span>
                              <span className="text-gray-500 text-sm">({count})</span>
                            </div>
                          </div>
                          
                          <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${
                                isCorrect ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Progress Info */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                    <div className="flex justify-between text-sm">
                      <span>Responses: <strong>{students.filter(s => s.hasAnswered).length} / {students.length}</strong></span>
                      <span>Total Votes: <strong>{pollResults.totalResponses}</strong></span>
                    </div>
                  </div>

                  {/* Next Poll Button */}
                  {timeLeft === 0 && (
                    <div className="mt-6 text-center">
                      <button
                        onClick={() => {
                          setShowCreatePoll(true);
                          setShowResults(false);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
                      >
                        ➕ Create Next Question
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Students Sidebar */}
          <div className="col-span-4">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Participants</h3>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                    {students.length} Online
                  </span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {students.length > 0 ? (
                    students.map(student => (
                      <div key={`student-${student.id}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            student.hasAnswered ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></div>
                          <div>
                            <div className="text-sm font-medium text-gray-800">
                              {student.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {student.hasAnswered ? '✅ Answered' : '⏳ Waiting'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => kickStudent(student.id)}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50"
                        >
                          Kick
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-gray-400 text-4xl mb-2">👥</div>
                      <p className="text-gray-500 text-sm">No students online</p>
                      <p className="text-gray-400 text-xs mt-1">Waiting for students to join...</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <button
                    onClick={() => setShowChat(true)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                  >
                    💬 Open Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChat && (
        <ChatPopup
          socket={socket}
          userType="teacher"
          userName="Teacher"
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
