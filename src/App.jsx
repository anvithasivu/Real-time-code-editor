import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import CodeEditor from './components/CodeEditor';
import UsersList from './components/UsersList';
import ChatBox from './components/ChatBox';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    socket.on('room-users', (usersList) => {
      setUsers(usersList);
    });

    return () => {
      socket.off('room-users');
    };
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim() && username.trim()) {
      socket.emit('join-room', { roomId, username });
      setJoined(true);
    }
  };

  if (!joined) {
    return (
      <div className="join-container">
        <form className="join-form" onSubmit={handleJoinRoom}>
          <h2>Join a Collaboration Room</h2>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="room-input"
            required
          />
          <input
            type="text"
            placeholder="Room ID (e.g. room-1)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="room-input"
            required
          />
          <button type="submit" className="join-button">Join Room</button>
        </form>
      </div>
    );
  }

  return (
    <div className="app-container split-view">
      <div className="main-workspace">
        <CodeEditor socket={socket} roomId={roomId} />
      </div>
      <div className="sidebar">
        <UsersList users={users} />
        <ChatBox socket={socket} roomId={roomId} />
      </div>
    </div>
  );
}

export default App;
