require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const codeRoutes = require('./routes/codeRoutes');

const app = express();

// Production CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL // Add your Vercel URL here in production
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/code', codeRoutes);

const server = http.createServer(app);

// Production Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Store io in app for controllers
app.set('io', io);

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId, username }) => {
    socket.join(roomId);
    
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    rooms.get(roomId).add({ socketId: socket.id, userId, username });
    
    const usersInRoom = Array.from(rooms.get(roomId));
    io.to(roomId).emit('room-users', usersInRoom);
    
    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);

    socket.on('disconnect', () => {
      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId);
        const userObj = Array.from(roomUsers).find(u => u.socketId === socket.id);
        if (userObj) {
          roomUsers.delete(userObj);
          io.to(roomId).emit('room-users', Array.from(roomUsers));
        }
      }
      console.log('User disconnected:', socket.id);
    });
  });

  socket.on('code-change', ({ roomId, fileId, code }) => {
    socket.to(roomId).emit('code-update', { fileId, code });
  });

  socket.on('cursor-move', ({ roomId, userId, username, cursor }) => {
    socket.to(roomId).emit('cursor-update', { userId, username, cursor });
  });

  socket.on('chat-message', ({ roomId, message, username }) => {
    io.to(roomId).emit('message', { username, message, timestamp: new Date() });
  });

  socket.on('file-created', ({ roomId, file }) => {
    socket.to(roomId).emit('file-created', file);
  });

  socket.on('file-deleted', ({ roomId, fileId }) => {
    socket.to(roomId).emit('file-deleted', fileId);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
