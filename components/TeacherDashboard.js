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
  
  // New state for sidebar management
  const [showSidebar, setShowSidebar] = useState(true)
  const [sidebarTab, setSidebarTab] = useState('participants') // 'participants' or 'chat'
  
  // Updated poll structure for dynamic options
  const [newPoll, setNewPoll] = useState({
    question: '',
    options: [
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ],
    maxTime: 60
  })

  // Enhanced useEffect with all necessary socket handlers
  useEffect(() => {
    if (!socket) return

    console.log('🔌 Setting up teacher dashboard');

    socket.on('connect', () => {
      console.log('✅ Teacher connected, requesting join');
      setConnectionStatus('Connected');
      socket.emit('join-teacher');
    });

    socket.on('students-list', (studentsList) => {
      console.log('👥 Teacher received students update:', studentsList);
      setStudents(Array.isArray(studentsList) ? studentsList : []);
    });

    socket.on('student-joined', (student) => {
      console.log('👋 Individual student joined notification:', student);
      setStudents(prev => {
        const exists = prev.find(s => s.id === student.id);
        if (!exists) {
          return [...prev, student];
        }
        return prev;
      });
    });

    socket.on('poll-created', (poll) => {
      console.log('📊 Poll created:', poll);
      setCurrentPoll(poll);
      setShowResults(true);
      setTimeLeft(poll.maxTime);
      setPollResults({ answers: {}, totalResponses: 0, poll });
    });

    socket.on('poll-results', (results) => {
      console.log('📈 Poll results update:', results);
      setPollResults(results);
    });

    socket.on('timer-update', (time) => {
      setTimeLeft(time);
    });

    socket.on('poll-ended', () => {
      console.log('🏁 Poll ended');
      setTimeLeft(0);
      
      // Add completed poll to history
      if (currentPoll && pollResults) {
        const completedPoll = {
          ...currentPoll,
          results: pollResults,
          completedAt: new Date().toISOString(),
          totalParticipants: students.length
        };
        setPollHistory(prev => [completedPoll, ...prev]);
      }
    });

    return () => {
      socket.off('connect');
      socket.off('students-list');
      socket.off('student-joined');
      socket.off('poll-created');
      socket.off('poll-results');
      socket.off('timer-update');
      socket.off('poll-ended');
    };
  }, [socket, currentPoll, pollResults, students.length]);

  const handleCreatePoll = (e) => {
    e.preventDefault();
    
    // Validate form
    const validOptions = newPoll.options.filter(opt => opt.text.trim());
    const correctAnswers = validOptions.filter(opt => opt.isCorrect);
    
    if (!newPoll.question.trim()) {
      alert('❌ Please enter a question!');
      return;
    }
    
    if (validOptions.length < 2) {
      alert('❌ Please add at least 2 options!');
      return;
    }
    
    if (correctAnswers.length === 0) {
      alert('❌ Please mark at least one correct answer!');
      return;
    }

    const pollData = {
      question: newPoll.question,
      options: validOptions.map(opt => opt.text),
      correctAnswers: correctAnswers.map(opt => opt.text),
      correctAnswer: correctAnswers[0].text,
      maxTime: newPoll.maxTime,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    console.log('🎯 Creating poll:', pollData);
    socket.emit('create-poll', pollData);
    
    // Update UI immediately
    setCurrentPoll(pollData);
    setShowCreatePoll(false);
    setShowResults(true);
    setTimeLeft(pollData.maxTime);
    
    // Reset form
    setNewPoll({ 
      question: '', 
      options: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ],
      maxTime: 60 
    });
  };

  const createNextPoll = () => {
    // Save current poll to history before creating new one
    if (currentPoll && pollResults) {
      const completedPoll = {
        ...currentPoll,
        results: pollResults,
        completedAt: new Date().toISOString(),
        totalParticipants: students.length
      };
      setPollHistory(prev => [completedPoll, ...prev]);
    }
    
    setShowCreatePoll(true);
    setShowResults(false);
    setCurrentPoll(null);
    setPollResults({ answers: {}, totalResponses: 0, poll: null });
    setShowHistory(false);
  };

  // Add new option
  const addOption = () => {
    setNewPoll(prev => ({
      ...prev,
      options: [...prev.options, { text: '', isCorrect: false }]
    }));
  };

  // Remove option
  const removeOption = (index) => {
    if (newPoll.options.length <= 2) {
      alert('❌ You need at least 2 options!');
      return;
    }
    
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  // Update option text
  const updateOptionText = (index, text) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, text } : opt
      )
    }));
  };

  // Update option correctness
  const updateOptionCorrectness = (index, isCorrect) => {
    setNewPoll(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => 
        i === index ? { ...opt, isCorrect } : opt
      )
    }));
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Toggle sidebar and switch to specific tab
  const toggleSidebar = (tab = null) => {
    if (tab) {
      setSidebarTab(tab);
      setShowSidebar(true);
    } else {
      setShowSidebar(!showSidebar);
    }
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
        <div className={`grid gap-6 transition-all duration-300 ${showSidebar ? 'grid-cols-12' : 'grid-cols-1'}`}>
          {/* Main Content */}
          <div className={`transition-all duration-300 ${showSidebar ? 'col-span-8' : 'col-span-1'}`}>
            {/* Navigation Tabs */}
            {(currentPoll || pollHistory.length > 0) && (
              <div className="mb-6">
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setShowHistory(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !showHistory 
                        ? 'bg-white text-purple-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Current Poll
                  </button>
                  <button
                    onClick={() => setShowHistory(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      showHistory 
                        ? 'bg-white text-purple-600 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Poll History ({pollHistory.length})
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm border p-6">
              
              {/* Poll History View */}
              {showHistory && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-gray-800">Poll History</h2>
                    <button
                      onClick={createNextPoll}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      ➕ Create New Poll
                    </button>
                  </div>

                  {pollHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-gray-400 text-4xl mb-4">📊</div>
                      <p className="text-gray-500">No polls completed yet</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pollHistory.map((poll, pollIndex) => (
                        <div key={poll.id} className="border rounded-lg overflow-hidden">
                          {/* Poll Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b">
                            <div className="flex justify-between items-center">
                              <h3 className="font-medium text-gray-800">
                                Poll #{pollHistory.length - pollIndex}
                              </h3>
                              <span className="text-sm text-gray-500">
                                Completed at {formatDate(poll.completedAt)}
                              </span>
                            </div>
                          </div>

                          {/* Question */}
                          <div className="p-4">
                            <div className="bg-gray-800 text-white p-3 rounded-lg mb-4">
                              <p className="font-medium">{poll.question}</p>
                            </div>

                            {/* Results */}
                            <div className="space-y-3">
                              {poll.options.map((option, index) => {
                                const count = poll.results.answers[option] || 0;
                                const percentage = getPercentage(count, poll.results.totalResponses);
                                const isCorrect = poll.correctAnswers?.includes(option) || option === poll.correctAnswer;
                                
                                return (
                                  <div key={index} className="relative">
                                    <div className="relative overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                                      <div 
                                        className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                      />
                                      
                                      <div className="relative z-10 flex items-center justify-between p-3">
                                        <div className="flex items-center space-x-3">
                                          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                          </div>
                                          <span className={`font-medium text-sm ${
                                            percentage > 25 ? 'text-white' : 'text-gray-800'
                                          }`}>
                                            {option}
                                          </span>
                                          {isCorrect && (
                                            <span className={`text-xs font-medium ${
                                              percentage > 25 ? 'text-white' : 'text-green-600'
                                            }`}>
                                              ✓ Correct
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="flex items-center space-x-2">
                                          <span className={`font-bold ${
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
                                );
                              })}
                            </div>

                            {/* Poll Summary */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                              <div className="flex justify-between text-sm text-blue-800">
                                <span><strong>Total Responses:</strong> {poll.results.totalResponses}</span>
                                <span><strong>Participants:</strong> {poll.totalParticipants}</span>
                                <span><strong>Response Rate:</strong> {poll.totalParticipants > 0 ? Math.round((poll.results.totalResponses / poll.totalParticipants) * 100) : 0}%</span>
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
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Let's Get Started</h2>
                      <p className="text-gray-600 mb-6">You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.</p>
                      <button
                        onClick={() => setShowCreatePoll(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-medium text-lg flex items-center gap-2 mx-auto"
                      >
                        <span className="text-xl">📊</span>
                        Intervue Poll
                      </button>
                    </div>
                  )}

                  {/* Enhanced Poll Creation Form */}
                  {showCreatePoll && (
                    <div className="max-w-4xl mx-auto">
                      <div className="bg-purple-600 text-white p-4 rounded-t-lg flex items-center gap-2">
                        <span className="text-xl">📊</span>
                        <span className="font-medium">Intervue Poll</span>
                      </div>
                      
                      <div className="bg-white border-x border-b rounded-b-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6">Let's Get Started</h2>
                        <p className="text-gray-600 mb-8">You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in real-time.</p>
                        
                        <form onSubmit={handleCreatePoll} className="space-y-6">
                          {/* Question Input */}
                          <div>
                            <label className="block text-lg font-medium text-gray-800 mb-3">Enter your question</label>
                            <div className="relative">
                              <textarea
                                value={newPoll.question}
                                onChange={(e) => setNewPoll(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Which planet is known as the Red Planet?"
                                className="w-full p-4 text-lg border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 resize-none"
                                rows="3"
                                maxLength={100}
                                required
                              />
                              <div className="absolute bottom-2 right-2 text-sm text-gray-400">
                                {newPoll.question.length}/100
                              </div>
                            </div>
                          </div>

                          {/* Timer Selection */}
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-medium text-gray-800">Timer</span>
                            <select
                              value={newPoll.maxTime}
                              onChange={(e) => setNewPoll(prev => ({ ...prev, maxTime: parseInt(e.target.value) }))}
                              className="bg-gray-100 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                            >
                              <option value={15}>15 seconds</option>
                              <option value={30}>30 seconds</option>
                              <option value={60}>60 seconds</option>
                              <option value={120}>2 minutes</option>
                            </select>
                          </div>

                          {/* Options Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-medium text-gray-800">Edit Options</h3>
                              <span className="text-lg font-medium text-gray-800">Is it Correct?</span>
                            </div>

                            <div className="space-y-4">
                              {newPoll.options.map((option, index) => (
                                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                                  {/* Option Number */}
                                  <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-medium">
                                      {index + 1}
                                    </div>
                                  </div>

                                  {/* Option Input */}
                                  <div className="flex-1">
                                    <input
                                      type="text"
                                      value={option.text}
                                      onChange={(e) => updateOptionText(index, e.target.value)}
                                      placeholder={['Mars', 'Venus', 'Jupiter', 'Saturn'][index] || `Option ${index + 1}`}
                                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  {/* Correct/Incorrect Radio Buttons */}
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        checked={option.isCorrect === true}
                                        onChange={() => updateOptionCorrectness(index, true)}
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                      />
                                      <span className="text-sm font-medium text-gray-700">Yes</span>
                                    </label>
                                    
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`correct-${index}`}
                                        checked={option.isCorrect === false}
                                        onChange={() => updateOptionCorrectness(index, false)}
                                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                                      />
                                      <span className="text-sm font-medium text-gray-700">No</span>
                                    </label>
                                  </div>

                                  {/* Remove Option Button */}
                                  {newPoll.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => removeOption(index)}
                                      className="flex-shrink-0 text-red-600 hover:text-red-800 p-2"
                                      title="Remove option"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Add Option Button */}
                            <button
                              type="button"
                              onClick={addOption}
                              className="mt-4 w-full border-2 border-dashed border-purple-300 text-purple-600 hover:border-purple-400 hover:text-purple-700 py-3 px-4 rounded-lg font-medium transition-colors"
                            >
                              + Add More Option
                            </button>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-4 pt-6">
                            <button
                              type="submit"
                              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-4 px-6 rounded-lg font-medium text-lg transition-colors"
                            >
                              🚀 Start Poll
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCreatePoll(false)}
                              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-4 px-6 rounded-lg font-medium text-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Updated Active Poll Display */}
                  {currentPoll && showResults && (
                    <div>
                      {/* Header with Create New Poll Button */}
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Current Poll</h2>
                        <button
                          onClick={createNextPoll}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                          ➕ Create New Poll
                        </button>
                      </div>

                      {/* Question Header with Purple Bar */}
                      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                        <div className="bg-purple-600 text-white p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-white bg-opacity-20 rounded flex items-center justify-center">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                              </svg>
                            </div>
                            <span className="text-lg font-medium">Question</span>
                          </div>
                          
                          {/* Timer */}
                          {timeLeft > 0 && (
                            <div className={`text-xl font-mono font-bold ${
                              timeLeft <= 10 ? 'animate-pulse' : ''
                            }`}>
                              {formatTime(timeLeft)}
                            </div>
                          )}
                        </div>

                        {/* Question Content */}
                        <div className="p-6">
                          {/* Question Text */}
                          <div className="bg-gray-800 text-white p-4 rounded-lg mb-6">
                            <h3 className="text-lg font-medium">{currentPoll.question}</h3>
                          </div>

                          {/* Options with Blue Progress Bars */}
                          <div className="space-y-4">
                            {currentPoll.options.map((option, index) => {
                              const count = pollResults.answers[option] || 0;
                              const percentage = getPercentage(count, pollResults.totalResponses);
                              const isCorrect = currentPoll.correctAnswers?.includes(option) || option === currentPoll.correctAnswer;
                              
                              return (
                                <div key={`option-${index}-${count}`} className="relative">
                                  <div className="relative overflow-hidden rounded-lg bg-gray-50 border border-gray-200">
                                    <div 
                                      className="absolute left-0 top-0 h-full bg-blue-500 transition-all duration-700 ease-out"
                                      style={{ width: `${percentage}%` }}
                                    />
                                    
                                    <div className="relative z-10 flex items-center justify-between p-4">
                                      <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                          {index + 1}
                                        </div>
                                        
                                        <span className={`font-medium ${
                                          percentage > 25 ? 'text-white' : 'text-gray-800'
                                        }`}>
                                          {option}
                                        </span>
                                        
                                        {isCorrect && (
                                          <span className={`text-sm font-medium flex-shrink-0 ${
                                            percentage > 25 ? 'text-white' : 'text-green-600'
                                          }`}>
                                            ✓ Correct
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center space-x-2 flex-shrink-0">
                                        <span className={`font-bold text-lg ${
                                          percentage > 25 ? 'text-white' : 'text-gray-800'
                                        }`}>
                                          {percentage}%
                                        </span>
                                        <span className={`text-sm ${
                                          percentage > 25 ? 'text-white opacity-80' : 'text-gray-500'
                                        }`}>
                                          ({count})
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Progress Summary */}
                          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex items-center space-x-4">
                                <span className="text-blue-800">
                                  <strong>Responses:</strong> {students.filter(s => s.hasAnswered).length} / {students.length}
                                </span>
                                <span className="text-blue-800">
                                  <strong>Total Votes:</strong> {pollResults.totalResponses}
                                </span>
                              </div>
                              
                              <div className="text-blue-600 font-medium">
                                {students.length > 0 ? Math.round((students.filter(s => s.hasAnswered).length / students.length) * 100) : 0}% Complete
                              </div>
                            </div>
                            
                            <div className="mt-3 w-full bg-blue-200 rounded-full h-2">
                              <div 
                                className="h-2 bg-blue-600 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${students.length > 0 ? (students.filter(s => s.hasAnswered).length / students.length) * 100 : 0}%` 
                                }}
                              />
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="mt-6 flex gap-4">
                            {timeLeft === 0 && (
                              <>
                                <button
                                  onClick={createNextPoll}
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                  ➕ Create Next Question
                                </button>
                                
                                <button
                                  onClick={() => setShowHistory(true)}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                                >
                                  📊 View All Polls
                                </button>
                              </>
                            )}
                            
                            {timeLeft > 0 && (
                              <button
                                onClick={() => {
                                  if (confirm('⚠️ Are you sure you want to end this poll early?')) {
                                    socket.emit('force-end-poll');
                                    setTimeLeft(0);
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

          {/* Enhanced Sidebar with Tabs */}
          {showSidebar && (
            <div className="col-span-4">
              <div className="bg-white rounded-lg shadow-sm border h-fit">
                {/* Tab Navigation */}
                <div className="border-b">
                  <div className="flex">
                    <button
                      onClick={() => setSidebarTab('participants')}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        sidebarTab === 'participants'
                          ? 'border-purple-600 text-purple-600 bg-purple-50'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                        <span>Participants</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {students.length}
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() => setSidebarTab('chat')}
                      className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        sidebarTab === 'chat'
                          ? 'border-purple-600 text-purple-600 bg-purple-50'
                          : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Chat</span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                  {/* Participants Tab */}
                  {sidebarTab === 'participants' && (
                    <div>
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
                                Kick out
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
                    </div>
                  )}

                  {/* Chat Tab */}
                  {sidebarTab === 'chat' && (
                    <div className="h-96">
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
          )}
        </div>
      </div>

     {/* SIMPLIFIED Floating Action Button - Single Button Only */}
<div className="fixed bottom-6 right-6 z-50">
  <button
    onClick={() => toggleSidebar()}
    className="w-14 h-14 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-105"
    title={showSidebar ? "Close" : "Open Chat & Participants"}
  >
    {showSidebar ? (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ) : (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    )}
  </button>
</div>

    </div>
  );
}
