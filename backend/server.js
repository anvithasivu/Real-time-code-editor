const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const pool = require('./config/db');

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

const rooms = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join Room Request
  // Join Room Request Notification
  socket.on('join-request-sent', async ({ roomId, userId, username }) => {
    try {
      const roomResult = await pool.query('SELECT creator_id FROM rooms WHERE id = $1', [roomId]);
      if (roomResult.rows.length > 0) {
        const creatorId = roomResult.rows[0].creator_id;
        
        let creatorSocketId = null;
        for (const rId in rooms) {
          const creator = rooms[rId].find(u => u.userId === creatorId);
          if (creator) {
            creatorSocketId = creator.socketId;
            break;
          }
        }

        if (creatorSocketId) {
          io.to(creatorSocketId).emit('incoming-request', {
            socketId: socket.id,
            userId,
            username,
            roomId
          });
        }
      }
    } catch (err) {
      console.error('Socket notification error:', err);
    }
  });

  socket.on('approve-user', ({ targetSocketId, roomId, userId, username }) => {
    io.to(targetSocketId).emit('join-approved', { roomId, userId, username });
  });

  socket.on('reject-user', ({ targetSocketId }) => {
    io.to(targetSocketId).emit('join-rejected', { message: 'The room creator denied your request.' });
  });

  // Actually Join Room
  const joinRoom = async (socket, roomId, userId, username) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = username;
    socket.data.userId = userId;
    
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }
    
    // Prevent duplicate entries for the same user ID (e.g. from rapid refreshes)
    rooms[roomId] = rooms[roomId].filter(u => u.userId !== userId);
    
    rooms[roomId].push({
      socketId: socket.id,
      userId,
      username,
      cursor: null
    });

    try {
      await pool.query(
        `INSERT INTO user_rooms (user_id, room_id) VALUES ($1, $2)
         ON CONFLICT (user_id, room_id) DO UPDATE SET last_accessed = CURRENT_TIMESTAMP`,
        [userId, roomId]
      );
    } catch (dbErr) {
      console.error('Error recording room history:', dbErr.message);
    }

    console.log(`User ${username} (${socket.id}) joined room: ${roomId}`);
    io.to(roomId).emit('room-users', rooms[roomId]);
    io.to(roomId).emit('new-message', {
      sender: 'System',
      text: `${username} joined the room.`,
      system: true
    });
  };

  socket.on('join-room', ({ roomId, userId, username }) => {
    joinRoom(socket, roomId, userId, username);
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
