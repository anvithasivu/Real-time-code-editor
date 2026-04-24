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

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for user joining a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room: ${roomId}`);
    
    // Broadcast updated user count to everyone in the room
    const clientsInRoom = io.sockets.adapter.rooms.get(roomId)?.size || 0;
    io.to(roomId).emit('room-users', clientsInRoom);
  });

  // Listen for code changes
  socket.on('code-change', ({ roomId, code }) => {
    // Broadcast the code to everyone in the room EXCEPT the sender
    socket.to(roomId).emit('code-change', code);
  });

  // Handle when a user disconnects or leaves a room
  socket.on('disconnecting', () => {
    for (const room of socket.rooms) {
      if (room !== socket.id) {
        // Calculate new size manually since the user hasn't fully left yet
        const clientsInRoom = (io.sockets.adapter.rooms.get(room)?.size || 1) - 1;
        socket.to(room).emit('room-users', clientsInRoom);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
