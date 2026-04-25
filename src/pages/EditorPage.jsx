import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';
import UsersList from '../components/UsersList';
import ChatBox from '../components/ChatBox';
import ApprovalModal from '../components/ApprovalModal';
import ActivityPanel from '../components/ActivityPanel';
import FileExplorer from '../components/FileExplorer';
import AIAssistantPanel from '../components/AIAssistantPanel';

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
  
  // Multi-file state
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [userRole, setUserRole] = useState('viewer');

  // AI State
  const [showAI, setShowAI] = useState(false);

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
        
        if (res.data.status === 'approved') {
          setUserRole(res.data.role);
          fetchFiles();
          initSocket(token);
        } else {
          setJoinStatus(res.data.status);
          if (res.data.status === 'pending') setStatusMessage('Waiting for room creator to approve your request...');
          if (res.data.status === 'rejected') setStatusMessage('Your join request was rejected.');
          
          // Setup a temporary socket to listen for real-time approval while on the waiting screen
          if (!socketRef.current) {
            const newSocket = io('http://localhost:5000', { auth: { token } });
            socketRef.current = newSocket;
            setSocket(newSocket);

            newSocket.on('request-approved-direct', (data) => {
              const currentUserId = parseInt(localStorage.getItem('userId'));
              if (data.userId === currentUserId && data.roomId === roomId) {
                setJoinStatus('approved');
                window.location.reload(); // Hard reload to re-init everything with full access
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to check status');
        setStatusMessage('Error checking room access.');
      }
    };

    const fetchFiles = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/code/files/${roomId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setFiles(res.data.files);
        if (res.data.files.length > 0) {
          setActiveFile(res.data.files[0]);
        }
      } catch (err) {
        console.error('Failed to fetch files');
      }
    };

    checkStatus();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, joinStatus]);

  const initSocket = (token) => {
    if (socketRef.current && socketRef.current.connected && joinStatus === 'approved') return;
    
    // Disconnect if we were on the waiting screen
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

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

    newSocket.on('activity-log', (activity) => {
      setActivities(prev => [...prev.slice(-19), activity]);
    });

    newSocket.on('user-typing', ({ username }) => {
      setTypingUsers(prev => prev.includes(username) ? prev : [...prev, username]);
    });

    newSocket.on('user-stop-typing', ({ username }) => {
      setTypingUsers(prev => prev.filter(u => u !== username));
    });

    // Multi-file sync
    newSocket.on('file-created', (file) => {
      setFiles(prev => [...prev, file]);
    });

    newSocket.on('file-deleted', (fileId) => {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      setActiveFile(prev => prev && prev.id === fileId ? null : prev);
    });
  };

  const handleCreateFile = async (name) => {
    try {
      const res = await axios.post('http://localhost:5000/code/create-file', 
        { roomId, name },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
      );
      setFiles(prev => [...prev, res.data.file]);
      setActiveFile(res.data.file);
      if (socket) socket.emit('file-created', { roomId, file: res.data.file });
    } catch (err) {
      alert('Failed to create file');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await axios.delete(`http://localhost:5000/code/delete-file/${fileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (activeFile && activeFile.id === fileId) {
        setActiveFile(files.find(f => f.id !== fileId) || null);
      }
      if (socket) socket.emit('file-deleted', { roomId, fileId });
    } catch (err) {
      alert('Failed to delete file');
    }
  };

  const handleSaveVersion = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/create-snapshot', { roomId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Version saved successfully!');
    } catch (err) {
      alert('Failed to save version.');
    }
  };

  const handleSendRequest = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/join-request', { roomId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJoinStatus('pending');
      setStatusMessage('Request sent! Waiting for approval...');
    } catch (err) {
      alert('Failed to send request.');
    }
  };

  if (joinStatus === 'checking') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <div className="logo-icon" style={{ width: '50px', height: '50px', fontSize: '1.2rem', margin: '0 auto' }}>CF</div>
        <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Checking access...</h2>
        <div style={{ color: '#555', fontSize: '0.9rem' }}>Workspace: {roomId}</div>
        <div className="loader"></div>
      </div>
    );
  }

  if (joinStatus === 'none') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <div className="logo-icon" style={{ width: '60px', height: '60px', fontSize: '1.5rem', margin: '0 auto' }}>CF</div>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Access Restricted</h2>
        <div style={{ padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>
          Workspace: {roomId}
        </div>
        <p style={{ color: '#888', maxWidth: '400px' }}>This workspace is private. You need permission from the owner to enter and collaborate.</p>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button onClick={handleSendRequest} className="join-button" style={{ backgroundColor: 'var(--accent-primary)', minWidth: '180px' }}>Request Access</button>
          <button onClick={() => navigate('/dashboard')} className="join-button" style={{ backgroundColor: '#222', minWidth: '150px' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (joinStatus === 'pending') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <div className="logo-icon" style={{ width: '60px', height: '60px', fontSize: '1.5rem', margin: '0 auto' }}>CF</div>
        <h2 style={{ fontSize: '2rem', margin: 0 }}>Request Pending</h2>
        <div style={{ padding: '8px 16px', backgroundColor: 'rgba(124, 77, 255, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
          Room: {roomId}
        </div>
        <p style={{ color: '#888' }}>{statusMessage}</p>
        <div className="loader"></div>
        <button onClick={() => navigate('/dashboard')} className="join-button" style={{ backgroundColor: '#222', marginTop: '10px' }}>Back to Dashboard</button>
      </div>
    );
  }

  if (joinStatus === 'rejected') {
    return (
      <div className="join-container" style={{ flexDirection: 'column', gap: '20px', textAlign: 'center' }}>
        <div className="logo-icon" style={{ width: '60px', height: '60px', fontSize: '1.5rem', margin: '0 auto', backgroundColor: '#442222' }}>CF</div>
        <h2 style={{ fontSize: '2rem', margin: 0, color: '#ff4444' }}>Access Denied</h2>
        <p style={{ color: '#888' }}>{statusMessage}</p>
        <button onClick={() => navigate('/dashboard')} className="join-button">Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="app-container split-view" style={{ position: 'relative' }}>
      <FileExplorer 
        files={files} 
        activeFileId={activeFile?.id} 
        onFileSelect={setActiveFile} 
        onCreateFile={handleCreateFile}
        onDeleteFile={handleDeleteFile}
        userRole={userRole}
      />

      <div className="main-workspace" style={{ position: 'relative' }}>
        {activeFile ? (
          <CodeEditor 
            socket={socket} 
            roomId={roomId} 
            fileId={activeFile.id} 
            initialCode={activeFile.content} 
            fileName={activeFile.name}
            userRole={userRole}
            onToggleAI={() => setShowAI(!showAI)}
            onSaveVersion={handleSaveVersion}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
            Select a file to start coding
          </div>
        )}
      </div>

      {showAI && activeFile && (
        <AIAssistantPanel 
          code={activeFile.content} 
          fileName={activeFile.name} 
          onClose={() => setShowAI(false)} 
        />
      )}

      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <UsersList users={users} typingUsers={typingUsers} />
        <ChatBox socket={socket} roomId={roomId} />
        <ActivityPanel activities={activities} />
      </div>
    </div>
  );
}

export default EditorPage;
