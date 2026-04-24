const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

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
    socket.data.roomId = roomId; // store on socket for disconnect handling
    socket.data.username = username;
    
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    
    // Add user to room tracking
    rooms[roomId].push({
      socketId: socket.id,
      username: username,
      cursor: null
    });

    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
    
    // Broadcast updated user list to everyone in the room
    io.to(roomId).emit('room-users', rooms[roomId]);
    
    // Send a system message that user joined
    io.to(roomId).emit('new-message', {
      sender: 'System',
      text: `${username} joined the room.`,
      system: true
    });
  });

  // Handle Code Change
  socket.on('code-change', ({ roomId, code }) => {
    socket.to(roomId).emit('code-change', code);
  });

  // Handle Cursor Move
  socket.on('cursor-move', ({ roomId, cursor }) => {
    if (rooms[roomId]) {
      const user = rooms[roomId].find(u => u.socketId === socket.id);
      if (user) {
        user.cursor = cursor;
        // Broadcast the updated user list containing cursor positions
        io.to(roomId).emit('room-users', rooms[roomId]);
      }
    }
  });

  // Handle Chat Messages
  socket.on('send-message', ({ roomId, message }) => {
    io.to(roomId).emit('new-message', {
      sender: socket.data.username,
      text: message,
      system: false
    });
  });

  // Handle Disconnect
  const handleLeave = () => {
    const roomId = socket.data.roomId;
    const username = socket.data.username;
    
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter(u => u.socketId !== socket.id);
      
      // If room is empty, clean it up
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      } else {
        // Otherwise, broadcast updated list and send system message
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
