const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const codeRoutes = require('./routes/codeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/code', codeRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// rooms tracking:
// roomId -> [ { socketId, username, cursor: null } ]
const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join Room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;
    
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    
    rooms[roomId].push({
      socketId: socket.id,
      username: username,
      cursor: null
    });

    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
    
    io.to(roomId).emit('room-users', rooms[roomId]);
    
    io.to(roomId).emit('new-message', {
      sender: 'System',
      text: `${username} joined the room.`,
      system: true
    });
  });

  socket.on('code-change', ({ roomId, code }) => {
    socket.to(roomId).emit('code-change', code);
  });

  socket.on('cursor-move', ({ roomId, cursor }) => {
    if (rooms[roomId]) {
      const user = rooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        user.cursor = cursor;
        io.to(roomId).emit('room-users', rooms[roomId]);
      }
    }
  });

  socket.on('send-message', ({ roomId, message }) => {
    io.to(roomId).emit('new-message', {
      sender: socket.data.username,
      text: message,
      system: false
    });
  });

  const handleLeave = () => {
    const roomId = socket.data.roomId;
    const username = socket.data.username;
    
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
      
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        io.to(roomId).emit('room-users', rooms[roomId]);
        io.to(roomId).emit('new-message', {
          sender: 'System',
          text: `${username} left the room.`,
          system: true
        });
      }
    }
  };

  socket.on('disconnecting', handleLeave);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
