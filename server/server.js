const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

let currentPoll = null;
let students = new Map();
let pollHistory = [];
let chatMessages = [];
let pollTimer = null;
let pollStartTime = null;

function calculateResults() {
  if (!currentPoll) return { answers: {}, totalResponses: 0, poll: null };
  
  const totalResponses = Object.values(currentPoll.answers).reduce((a, b) => a + b, 0);
  return {
    answers: currentPoll.answers,
    totalResponses: totalResponses,
    poll: currentPoll
  };
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Teacher joins
  socket.on('join-teacher', () => {
    console.log('Teacher joined');
    socket.join('teacher');
    
    // Send current state immediately
    socket.emit('current-poll', currentPoll);
    socket.emit('students-list', Array.from(students.values()));
    socket.emit('poll-history', pollHistory);
    
    if (currentPoll && currentPoll.isActive) {
      const results = calculateResults();
      socket.emit('poll-results', results);
      
      // Send timer if poll is active
      if (pollStartTime) {
        const elapsed = Math.floor((Date.now() - pollStartTime) / 1000);
        const remaining = Math.max(0, currentPoll.maxTime - elapsed);
        socket.emit('timer-update', { remaining });
      }
    }
    
    console.log('Teacher setup complete. Current students:', Array.from(students.values()));
  });

  // Student joins - FIXED VERSION
  socket.on('join-student', (studentName) => {
    console.log('Student attempting to join with name:', studentName);
    
    const validName = studentName && studentName.trim() ? studentName.trim() : `Student_${Date.now()}`;
    
    const student = {
      id: socket.id,
      name: validName,
      hasAnswered: false,
      answer: null,
      joinedAt: new Date()
    };
    
    students.set(socket.id, student);
    socket.join('students');
    
    console.log('✅ Student successfully added:', student);
    console.log('📊 Total students now:', students.size);
    
    // FORCE broadcast to all teachers immediately
    const studentsList = Array.from(students.values());
    console.log('🔄 Broadcasting to teachers:', studentsList);
    
    io.to('teacher').emit('student-joined', student);
    io.to('teacher').emit('students-list', studentsList);
    
    // Send acknowledgment to student
    socket.emit('student-connected', { success: true, name: validName });
    
    // Send current poll if exists
    if (currentPoll && currentPoll.isActive && pollStartTime) {
      const elapsedTime = Math.floor((Date.now() - pollStartTime) / 1000);
      const remainingTime = Math.max(0, currentPoll.maxTime - elapsedTime);
      
      console.log(`🕐 Sending poll to late joiner. Remaining: ${remainingTime}s`);
      
      const pollWithRemainingTime = {
        ...currentPoll,
        remainingTime: remainingTime
      };
      
      socket.emit('new-poll', pollWithRemainingTime);
      
      if (remainingTime <= 0) {
        const results = calculateResults();
        socket.emit('poll-closed', results);
      }
    }
  });

  // Create poll - FIXED VERSION
  socket.on('create-poll', (pollData) => {
    console.log('🎯 Creating new poll:', pollData);
    
    // Clear existing poll and timer
    if (pollTimer) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
    
    currentPoll = {
      id: uuidv4(),
      question: pollData.question,
      options: pollData.options,
      correctAnswer: pollData.correctAnswer,
      maxTime: pollData.maxTime || 15,
      createdAt: new Date(),
      answers: {},
      isActive: true
    };

    pollStartTime = Date.now();
    console.log('📝 Poll created:', currentPoll);
    
    // Reset all students
    students.forEach(student => {
      student.hasAnswered = false;
      student.answer = null;
    });

    // FORCE broadcast to EVERYONE
    console.log('📡 Broadcasting new poll to all clients');
    io.emit('new-poll', currentPoll);
    
    // Send updated students list to teacher
    io.to('teacher').emit('students-list', Array.from(students.values()));
    
    // Start auto-close timer
    pollTimer = setTimeout(() => {
      console.log('⏰ Poll auto-closing');
      closePoll();
    }, currentPoll.maxTime * 1000);

    // Start live timer broadcasts
    const timerInterval = setInterval(() => {
      if (!currentPoll || !currentPoll.isActive) {
        clearInterval(timerInterval);
        return;
      }
      
      const elapsed = Math.floor((Date.now() - pollStartTime) / 1000);
      const remaining = Math.max(0, currentPoll.maxTime - elapsed);
      
      io.emit('timer-update', { remaining });
      
      if (remaining <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  });

  // Submit answer - FIXED VERSION
  socket.on('submit-answer', (answer) => {
    console.log('📝 Answer submitted:', answer, 'by:', socket.id);
    
    if (currentPoll && currentPoll.isActive && students.has(socket.id)) {
      const student = students.get(socket.id);
      
      if (!student.hasAnswered) {
        student.hasAnswered = true;
        student.answer = answer;
        
        if (!currentPoll.answers[answer]) {
          currentPoll.answers[answer] = 0;
        }
        currentPoll.answers[answer]++;

        students.set(socket.id, student);
        
        const results = calculateResults();
        console.log('📊 Broadcasting live results:', results);
        
        // Broadcast to EVERYONE
        io.emit('poll-results', results);
        io.to('teacher').emit('students-list', Array.from(students.values()));

        // Check if all answered
        const totalStudents = students.size;
        const answeredStudents = Array.from(students.values()).filter(s => s.hasAnswered).length;
        
        console.log(`✅ Progress: ${answeredStudents}/${totalStudents} answered`);
        
        if (answeredStudents === totalStudents && totalStudents > 0) {
          console.log('🎉 All students answered!');
          setTimeout(() => closePoll(), 2000);
        }
      }
    }
  });

  // Chat functionality
  socket.on('send-message', (messageData) => {
    const message = {
      id: uuidv4(),
      sender: messageData.sender,
      senderType: messageData.senderType,
      message: messageData.message,
      timestamp: new Date()
    };
    
    chatMessages.push(message);
    io.emit('new-message', message);
  });

  socket.on('get-chat-history', () => {
    socket.emit('chat-history', chatMessages);
  });

  // Kick student
  socket.on('kick-student', (studentId) => {
    console.log('👢 Kicking student:', studentId);
    if (students.has(studentId)) {
      io.to(studentId).emit('kicked');
      students.delete(studentId);
      io.to('teacher').emit('students-list', Array.from(students.values()));
    }
  });

  // Disconnect handling
  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
    if (students.has(socket.id)) {
      students.delete(socket.id);
      console.log('📉 Student removed. Remaining:', students.size);
      io.to('teacher').emit('students-list', Array.from(students.values()));
    }
  });

  function closePoll() {
    if (currentPoll && currentPoll.isActive) {
      console.log('🔒 Closing poll:', currentPoll.id);
      
      currentPoll.isActive = false;
      currentPoll.closedAt = new Date();
      
      if (pollTimer) {
        clearTimeout(pollTimer);
        pollTimer = null;
      }
      
      const finalResults = calculateResults();
      pollHistory.push({ ...currentPoll });
      
      io.emit('poll-closed', finalResults);
      io.to('teacher').emit('poll-history', pollHistory);
      
      console.log('✅ Poll closed successfully');
      
      currentPoll = null;
      pollStartTime = null;
    }
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Polling server running on port ${PORT}`);
});
