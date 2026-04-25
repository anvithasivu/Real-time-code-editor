import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [createRoomId, setCreateRoomId] = useState('');
  const [joinRoomId, setJoinRoomId] = useState('');
  const [pastRooms, setPastRooms] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const username = localStorage.getItem('username');

  useEffect(() => {
    fetchPastRooms();
    fetchPendingRequests();
    
    // Poll for new requests every 10 seconds
    const interval = setInterval(fetchPendingRequests, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPastRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/code/my-rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPastRooms(res.data.rooms);
    } catch (err) {
      console.error('Failed to fetch past rooms');
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/code/pending-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to fetch pending requests');
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/update-request', { requestId, status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchPendingRequests();
      if (status === 'approved') fetchPastRooms();
    } catch (err) {
      setError('Failed to update request');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!createRoomId) return setError('Please enter a Room ID to create.');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/code/create-room', { roomId: createRoomId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate(`/room/${createRoomId}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create room.');
    }
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!joinRoomId) return setError('Please enter a Room ID to join.');
    navigate(`/room/${joinRoomId}`);
  };

  return (
    <div className="join-container" style={{ padding: '20px', alignItems: 'flex-start' }}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <h2>Welcome, <span style={{ color: 'var(--accent-color)' }}>{username}</span>!</h2>
          <button onClick={handleLogout} className="join-button" style={{ backgroundColor: '#f44336', width: 'auto', padding: '8px 16px' }}>Logout</button>
        </div>

        {error && <p style={{ color: '#ff4444', marginBottom: '20px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div className="join-form" style={{ width: '100%', maxWidth: 'none' }}>
              <h3>Create a New Room</h3>
              <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="Enter a unique Room Name..."
                  value={createRoomId}
                  onChange={(e) => setCreateRoomId(e.target.value)}
                  className="room-input"
                  required
                />
                <button type="submit" className="join-button">Create Room</button>
              </form>
            </div>

            <div className="join-form" style={{ width: '100%', maxWidth: 'none' }}>
              <h3>Join Existing Room</h3>
              <form onSubmit={handleJoinRoom} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                <input
                  type="text"
                  placeholder="Enter Room Name..."
                  value={joinRoomId}
                  onChange={(e) => setJoinRoomId(e.target.value)}
                  className="room-input"
                  required
                />
                <button type="submit" className="join-button" style={{ backgroundColor: '#333' }}>Join Room</button>
              </form>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
            {/* Pending Requests Section */}
            <div className="join-form" style={{ width: '100%', maxWidth: 'none' }}>
              <h3>Pending Join Requests</h3>
              {pendingRequests.length === 0 ? (
                <p style={{ color: '#aaa', marginTop: '15px' }}>No pending requests.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{
                      padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--accent-color)'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'white' }}>{req.username}</h4>
                        <small style={{ color: '#aaa' }}>Room: {req.room_id}</small>
                      </div>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => handleRequestAction(req.id, 'approved')} style={{ padding: '4px 8px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
                        <button onClick={() => handleRequestAction(req.id, 'rejected')} style={{ padding: '4px 8px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✗</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Rooms Section */}
            <div className="join-form" style={{ width: '100%', maxWidth: 'none' }}>
              <h3>Your Past Rooms</h3>
              {pastRooms.length === 0 ? (
                <p style={{ color: '#aaa', marginTop: '15px' }}>You haven't joined any rooms yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px', maxHeight: '300px', overflowY: 'auto' }}>
                  {pastRooms.map(room => (
                    <div key={room.id} style={{
                      padding: '12px', backgroundColor: 'var(--bg-color)', borderRadius: '6px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333'
                    }}>
                      <div>
                        <h4 style={{ margin: 0, color: 'white' }}>{room.id}</h4>
                        <small style={{ color: '#aaa' }}>Last accessed: {new Date(room.last_accessed).toLocaleString()}</small>
                      </div>
                      <button onClick={() => navigate(`/room/${room.id}`)} className="join-button" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.9rem' }}>Rejoin</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
