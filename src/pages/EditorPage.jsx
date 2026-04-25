import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';
import UsersList from '../components/UsersList';
import ChatBox from '../components/ChatBox';
import ApprovalModal from '../components/ApprovalModal';
import ActivityPanel from '../components/ActivityPanel';

function EditorPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const socketRef = React.useRef(null);
  const [users, setUsers] = useState([]);
  const [joinStatus, setJoinStatus] = useState('checking'); // 'checking', 'none', 'pending', 'approved', 'rejected'
  const [statusMessage, setStatusMessage] = useState('Checking access...');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activities, setActivities] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/code/request-status/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data.status === 'approved' || res.data.status === 'owner') {
          initSocket(token);
        } else {
          setJoinStatus(res.data.status);
          if (res.data.status === 'pending') setStatusMessage('Waiting for room creator to approve your request...');
          if (res.data.status === 'rejected') setStatusMessage('Your join request was rejected.');
        }
      } catch (err) {
        console.error('Failed to check status');
        setStatusMessage('Error checking room access.');
      }
    };

    checkStatus();

    let interval;
    if (joinStatus === 'pending') {
      interval = setInterval(checkStatus, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, joinStatus]);

  const initSocket = (token) => {
    if (socketRef.current) return;
    
    const username = localStorage.getItem('username');
    const userId = parseInt(localStorage.getItem('userId'), 10);

    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join-room', { roomId, userId, username });
    });

    newSocket.on('room-users', (usersList) => {
      setJoinStatus('approved');
      setUsers(usersList);
    });

    newSocket.on('join-approved', () => {
      setJoinStatus('approved');
      newSocket.emit('join-room', { roomId, userId, username });
    });

    newSocket.on('join-rejected', (data) => {
      setJoinStatus('rejected');
      setStatusMessage(data.message || 'Your join request was rejected.');
    });

    newSocket.on('incoming-request', (req) => {
      setPendingRequests(prev => [...prev, req]);
    });

    newSocket.on('activity-log', (activity) => {
      setActivities(prev => [...prev.slice(-19), activity]);
    });

    newSocket.on('user-typing', ({ username }) => {
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    });

    newSocket.on('user-stop-typing', ({ username }) => {
      setTypingUsers(prev => prev.filter(u => u !== username));
    });
  };

  const handleApprove = async (req) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/update-request', { requestId: req.id || req.requestId, status: 'approved' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (socket) {
        socket.emit('approve-user', { targetSocketId: req.socketId, roomId: req.roomId, userId: req.userId, username: req.username });
      }
      setPendingRequests(prev => prev.filter(r => (r.socketId || r.id) !== (req.socketId || req.id)));
    } catch (err) {
      console.error('Approval failed');
    }
  };

  const handleReject = async (req) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/update-request', { requestId: req.id || req.requestId, status: 'rejected' }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (socket) {
        socket.emit('reject-user', { targetSocketId: req.socketId });
      }
      setPendingRequests(prev => prev.filter(r => (r.socketId || r.id) !== (req.socketId || req.id)));
    } catch (err) {
      console.error('Rejection failed');
    }
  };

  if (joinStatus === 'checking') {
    return <div className="join-container"><h2>Checking access...</h2></div>;
  }

  if (joinStatus === 'none') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2>Access Restricted</h2>
        <p>You need permission to enter this room.</p>
        <button onClick={() => navigate('/dashboard')} className="join-button" style={{ backgroundColor: '#333' }}>Back to Dashboard</button>
      </div>
    );
  }

  if (joinStatus === 'pending') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2>Request Pending</h2>
        <p>{statusMessage}</p>
        <div className="loader"></div>
        <button onClick={() => navigate('/dashboard')} className="join-button" style={{ backgroundColor: '#333' }}>Back to Dashboard</button>
      </div>
    );
  }

  if (joinStatus === 'rejected') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px' }}>
        <h2>Access Denied</h2>
        <p style={{ color: '#ff4444' }}>{statusMessage}</p>
        <button onClick={() => navigate('/dashboard')} className="join-button">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="app-container split-view" style={{ position: 'relative' }}>
      <ApprovalModal 
        requests={pendingRequests} 
        onApprove={handleApprove} 
        onReject={handleReject} 
      />
      
      <div className="main-workspace">
        <CodeEditor socket={socket} roomId={roomId} />
      </div>
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <UsersList users={users} typingUsers={typingUsers} />
        <ChatBox socket={socket} roomId={roomId} />
        <ActivityPanel activities={activities} />
      </div>
    </div>
  );
}

export default EditorPage;
