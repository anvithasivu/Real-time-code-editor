import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeModal, setActiveModal] = useState(null); 
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const navigate = useNavigate();

  const currentUserId = parseInt(localStorage.getItem('userId'));

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (!storedUsername) {
      navigate('/login');
      return;
    }
    setUsername(storedUsername);
    fetchData();

    const token = localStorage.getItem('token');
    const socket = io('http://localhost:5000', { auth: { token } });
    
    socket.on('incoming-request-global', (newReq) => {
      setPendingRequests(prev => {
        if (prev.find(r => r.id === newReq.id)) return prev;
        return [newReq, ...prev];
      });
    });

    return () => socket.disconnect();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [roomsRes, reqRes] = await Promise.all([
        axios.get('http://localhost:5000/code/my-rooms', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/code/pending-requests', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setRooms(roomsRes.data.rooms);
      setPendingRequests(reqRes.data.requests);
    } catch (err) {
      console.error('Failed to fetch dashboard data');
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/update-request', 
        { requestId, status }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      if (status === 'approved') {
        fetchData(); 
      }
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleDeleteRoom = async (id) => {
    if (!window.confirm(`Are you sure you want to permanently delete room "${id}"? This action cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/code/delete-room/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setRooms(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete room');
    }
  };

  const createRoom = async () => {
    if (!roomId) return alert('Enter a Room ID');
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/create', { roomId }, { headers: { Authorization: `Bearer ${token}` } });
      navigate(`/editor/${roomId}`);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create room');
    }
  };

  const joinRoom = () => {
    if (!roomId) return alert('Enter a Room ID');
    navigate(`/editor/${roomId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const fetchHistory = async (id) => {
    setSelectedRoomId(id);
    setActiveModal('history');
    setLoadingModal(true);
    setModalData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/code/snapshots/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setModalData(res.data.snapshots || []);
    } catch (err) {
      console.error('Failed to fetch history');
      setModalData([]);
    } finally {
      setLoadingModal(false);
    }
  };

  const fetchAnalytics = async (id) => {
    setSelectedRoomId(id);
    setActiveModal('analytics');
    setLoadingModal(true);
    setModalData(null);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/code/analytics/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setModalData(res.data.analytics || []);
    } catch (err) {
      console.error('Failed to fetch analytics');
      setModalData([]);
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="premium-dashboard">
      <header className="glass-header">
        <div className="brand">
          <div className="logo-icon">CF</div>
          <h1>CodeFusion <span>Sync</span></h1>
        </div>
        <div className="user-controls">
          <div className="user-info">
            <span className="welcome">Welcome back,</span>
            <span className="name">{username}</span>
          </div>
          <button onClick={handleLogout} className="logout-button">Sign Out</button>
        </div>
      </header>

      <main className="content-grid">
        <aside className="actions-sidebar">
          <div className="glass-card action-card">
            <h2>Quick Actions</h2>
            <div className="input-field">
              <label>Room Identity</label>
              <input 
                type="text" 
                placeholder="Enter room name or ID" 
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
            </div>
            <div className="button-stack">
              <button onClick={createRoom} className="btn-glow primary">Create Workspace</button>
              <button onClick={joinRoom} className="btn-glow secondary">Join Session</button>
            </div>
          </div>
        </aside>

        <section className="rooms-main">
          {/* Approval Section */}
          <div className="glass-card section-card" style={{ marginBottom: '30px', borderLeft: '4px solid #7c4dff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Join Requests & Approvals</h2>
              {pendingRequests.length > 0 && <span className="pulse-badge">{pendingRequests.length} New</span>}
            </div>
            
            <div className="request-container">
              {pendingRequests.length === 0 ? (
                <p style={{ color: '#555', fontSize: '0.9rem', margin: 0 }}>No pending access requests at the moment.</p>
              ) : (
                <div className="request-list">
                  {pendingRequests.map((req, idx) => (
                    <div key={req.id || idx} className="request-item-premium">
                      <div className="req-user">
                        <span className="avatar">{(req.username || 'U')[0].toUpperCase()}</span>
                        <div>
                          <strong>{req.username}</strong>
                          <small>wants access to <strong>{req.room_id}</strong></small>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleRequestAction(req.id, 'approved')} className="btn-action approve">Approve</button>
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} className="btn-action reject">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="section-header">
            <h2>Your Workspaces</h2>
            <span className="count">{rooms.length} Active</span>
          </div>
          
          <div className="rooms-container">
            {rooms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📂</div>
                <h3>No sessions yet</h3>
                <p>Create a room to start collaborating in real-time.</p>
              </div>
            ) : (
              rooms.map((room) => {
                const isCreator = room.creator_id === currentUserId;
                return (
                  <div key={room.id} className="room-item glass-card">
                    <div className="room-status-indicator"></div>
                    <div className="room-info">
                      <h3 className="room-name">{room.id}</h3>
                      <p className="room-meta">Last synced {new Date(room.last_accessed || room.last_updated).toLocaleDateString()}</p>
                    </div>
                    <div className="room-controls">
                      <button onClick={() => fetchHistory(room.id)} className="icon-btn" title="Version History">📜</button>
                      <button onClick={() => fetchAnalytics(room.id)} className="icon-btn" title="Room Stats">📊</button>
                      <button 
                        onClick={() => handleDeleteRoom(room.id)} 
                        className={`icon-btn delete ${!isCreator ? 'disabled' : ''}`} 
                        title={isCreator ? "Delete Room" : "Only creator can delete"}
                        disabled={!isCreator}
                        style={{ color: !isCreator ? '#333' : '#ff4444', cursor: !isCreator ? 'not-allowed' : 'pointer' }}
                      >
                        🗑️
                      </button>
                      <button onClick={() => navigate(`/editor/${room.id}`)} className="action-btn">Rejoin</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {activeModal && (
        <div className="modal-backdrop" onClick={() => setActiveModal(null)}>
          <div className="premium-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeModal === 'history' ? 'Version Timeline' : 'Collaboration Stats'}</h3>
              <button onClick={() => setActiveModal(null)} className="close-x">✕</button>
            </div>
            
            <div className="modal-body">
              {loadingModal ? (
                <div className="loading-state">
                  <div className="loader"></div>
                  <p>Fetching records...</p>
                </div>
              ) : !modalData || modalData.length === 0 ? (
                <div className="no-data">
                  <p>No data found for this room.</p>
                  {activeModal === 'history' && <small>Use the "Save Version" button inside the editor to create snapshots.</small>}
                </div>
              ) : (
                <div className="data-list">
                  {modalData.map((item, idx) => (
                    <div key={idx} className="data-item">
                      {activeModal === 'history' ? (
                        <>
                          <div className="item-main">Snapshot by <strong>{item.username}</strong></div>
                          <div className="item-sub">{new Date(item.timestamp).toLocaleString()}</div>
                        </>
                      ) : (
                        <>
                          <div className="item-main"><strong>{item.username}</strong></div>
                          <div className="item-stat">{item.edits_count} contributions</div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        :root {
          --bg-dark: #0a0a0f;
          --card-bg: rgba(255, 255, 255, 0.03);
          --accent-primary: #7c4dff;
          --accent-secondary: #00e5ff;
          --text-main: #e0e0e0;
          --text-muted: #888888;
        }

        .premium-dashboard {
          min-height: 100vh;
          background: radial-gradient(circle at top right, #1a1a2e, var(--bg-dark));
          color: var(--text-main);
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }

        .glass-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-bottom: 30px;
        }

        .brand { display: flex; alignItems: center; gap: 15px; }
        .logo-icon {
          width: 40px; height: 40px; background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.9rem;
        }
        .brand h1 { font-size: 1.4rem; margin: 0; font-weight: 700; letter-spacing: -0.5px; }
        .brand h1 span { color: var(--accent-secondary); opacity: 0.8; }

        .user-controls { display: flex; align-items: center; gap: 20px; }
        .user-info { text-align: right; }
        .welcome { display: block; font-size: 0.75rem; color: var(--text-muted); }
        .name { font-weight: 600; font-size: 0.95rem; }

        .logout-button {
          padding: 8px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
          color: white; border-radius: 8px; cursor: pointer; transition: all 0.3s; font-size: 0.85rem;
        }
        .logout-button:hover { background: rgba(255, 68, 68, 0.1); border-color: rgba(255, 68, 68, 0.2); }

        .content-grid {
          display: grid; grid-template-columns: 320px 1fr; gap: 30px; max-width: 1400px; margin: 0 auto;
        }

        .glass-card {
          background: var(--card-bg); backdrop-filter: blur(5px); border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.05); padding: 25px;
        }

        .action-card h2 { font-size: 1.1rem; margin-bottom: 20px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; }
        .input-field { margin-bottom: 20px; }
        .input-field label { display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; }
        .input-field input {
          width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
          padding: 12px; border-radius: 10px; color: white; transition: all 0.3s;
        }
        .input-field input:focus { border-color: var(--accent-primary); outline: none; box-shadow: 0 0 15px rgba(124, 77, 255, 0.2); }

        .button-stack { display: flex; flexDirection: column; gap: 12px; }
        .btn-glow {
          padding: 14px; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s;
        }
        .btn-glow.primary { background: var(--accent-primary); color: white; }
        .btn-glow.secondary { background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); }
        .btn-glow:hover { transform: translateY(-2px); filter: brightness(1.2); }

        .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .section-header h2 { font-size: 1.2rem; margin: 0; }
        .count { background: var(--accent-primary); font-size: 0.75rem; padding: 4px 12px; border-radius: 20px; }

        .rooms-container { display: grid; gap: 15px; }
        .room-item {
          display: flex; align-items: center; padding: 15px 25px; transition: all 0.3s; position: relative; overflow: hidden;
        }
        .room-item:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); }
        .room-status-indicator {
          width: 4px; height: 30px; background: var(--accent-secondary); position: absolute; left: 0; border-radius: 0 4px 4px 0;
        }

        .room-info { flex: 1; }
        .room-name { font-size: 1.05rem; margin: 0 0 4px 0; }
        .room-meta { font-size: 0.8rem; color: var(--text-muted); margin: 0; }

        .room-controls { display: flex; align-items: center; gap: 10px; }
        .icon-btn {
          width: 38px; height: 38px; background: rgba(255,255,255,0.05); border: none;
          border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.3s; font-size: 1rem;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.15); transform: rotate(15deg); }
        .icon-btn.delete:hover { background: rgba(255, 68, 68, 0.2); }
        
        .action-btn {
          padding: 10px 20px; background: var(--accent-primary); color: white; border: none;
          border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s;
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .premium-modal {
          background: #14141c; border: 1px solid rgba(255,255,255,0.1); width: 90%; max-width: 450px;
          border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;
        }
        .modal-header {
          padding: 20px 25px; border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-body { padding: 20px; }
        .data-list { display: grid; gap: 10px; }
        .data-item {
          padding: 12px 18px; background: rgba(255,255,255,0.02); border-radius: 12px;
          display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.05);
        }
        .item-stat { color: var(--accent-secondary); font-weight: 600; font-size: 0.9rem; }
        .close-x { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem; }
        
        .loading-state { text-align: center; padding: 40px 0; }
        .no-data { text-align: center; color: #555; padding: 40px 0; }
        .no-data small { display: block; margin-top: 10px; color: var(--text-muted); font-style: italic; }

        .pulse-badge {
          background: #ff4444; color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.7rem;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        .request-item-premium {
          display: flex; justify-content: space-between; align-items: center; padding: 12px 15px;
          background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 10px;
        }
        .req-user { display: flex; align-items: center; gap: 12px; }
        .avatar {
          width: 35px; height: 35px; background: var(--accent-primary); border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-weight: bold;
        }
        .req-user strong { display: block; font-size: 0.9rem; }
        .req-user small { color: #666; font-size: 0.75rem; }

        .btn-action {
          padding: 6px 16px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: 0.3s;
        }
        .btn-action.approve { background: #4CAF50; color: white; border: none; }
        .btn-action.approve:hover { background: #45a049; transform: translateY(-1px); }
        .btn-action.reject { background: transparent; color: #ff4444; border: 1px solid #ff4444; }
        .btn-action.reject:hover { background: rgba(255, 68, 68, 0.1); }
      `}</style>
    </div>
  );
}

export default Dashboard;
