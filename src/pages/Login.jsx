import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('username', response.data.username);
      
      if (roomId) {
        navigate(`/room/${roomId}`);
      } else {
        setError('Please enter a Room ID to join after login.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="join-container">
      <form className="join-form" onSubmit={handleLogin}>
        <h2>Login to Collaborate</h2>
        {error && <p style={{ color: '#ff4444', textAlign: 'center' }}>{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="room-input"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="room-input"
          required
        />
        <input
          type="text"
          placeholder="Room ID to Join (e.g. room-1)"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="room-input"
          required
        />
        <button type="submit" className="join-button">Login & Join</button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-color)' }}>Sign up</Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
