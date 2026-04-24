import React, { useState } from 'react';
import { io } from 'socket.io-client';
import CodeEditor from './components/CodeEditor';
import './App.css';

const socket = io('http://localhost:5000');

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      socket.emit('join-room', roomId);
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
            placeholder="Enter Room ID (e.g. room-1)"
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
    <div className="app-container">
      <CodeEditor socket={socket} roomId={roomId} />
    </div>
  );
}

export default App;
