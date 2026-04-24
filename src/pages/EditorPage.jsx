import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import CodeEditor from '../components/CodeEditor';
import UsersList from '../components/UsersList';
import ChatBox from '../components/ChatBox';

function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');

    if (!token || !username) {
      navigate('/login');
      return;
    }

    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId, username });
    });

    newSocket.on('room-users', (usersList) => {
      setUsers(usersList);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, navigate]);

  if (!socket) return <div style={{ color: 'white', padding: '20px' }}>Connecting to room...</div>;

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

export default EditorPage;
