import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Signup = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/auth/signup', { username, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  };

  return (
    <div className="join-container">
      <form className="join-form" onSubmit={handleSignup}>
        <h2>Create an Account</h2>
        {error && <p style={{ color: '#ff4444', textAlign: 'center' }}>{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="room-input"
          required
        />
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
        <button type="submit" className="join-button">Sign Up</button>
        <p style={{ textAlign: 'center', marginTop: '10px' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)' }}>Login</Link>
        </p>
      </form>
    </div>
  );
};

export default Signup;
