import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('http://localhost:5000/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('username', res.data.username);
      localStorage.setItem('userId', res.data.userId);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-glass-card">
        <div className="auth-header">
          <div className="logo-icon">CF</div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to CodeFusion</p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Your username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/signup">Create one</Link>
        </p>
      </div>

      <style>{`
        .auth-page {
          min-height: 100vh;
          background: radial-gradient(circle at top right, #1a1a2e, #050505);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        .auth-glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 40px;
          border-radius: 24px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
        }
        .auth-header { text-align: center; margin-bottom: 30px; }
        .logo-icon {
          width: 45px; height: 45px; background: linear-gradient(135deg, #7c4dff, #00e5ff);
          border-radius: 12px; display: flex; align-items: center; justify-content: center;
          font-weight: bold; margin: 0 auto 20px; font-size: 1.1rem;
        }
        .auth-header h1 { font-size: 1.8rem; margin: 0 0 8px 0; letter-spacing: -0.5px; }
        .auth-header p { color: #888; font-size: 0.9rem; }

        .auth-form { display: flex; flex-direction: column; gap: 20px; }
        .input-group label { display: block; font-size: 0.8rem; color: #888; margin-bottom: 8px; font-weight: 500; }
        .input-group input {
          width: 100%; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1);
          padding: 12px 16px; border-radius: 12px; color: white; transition: 0.3s; font-size: 0.95rem;
        }
        .input-group input:focus { border-color: #7c4dff; outline: none; box-shadow: 0 0 15px rgba(124,77,255,0.2); }

        .auth-submit {
          background: #7c4dff; color: white; border: none; padding: 14px; border-radius: 12px;
          font-weight: 600; cursor: pointer; transition: 0.3s; margin-top: 10px; font-size: 1rem;
        }
        .auth-submit:hover { transform: translateY(-2px); filter: brightness(1.1); box-shadow: 0 10px 20px rgba(124,77,255,0.3); }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        .auth-error {
          background: rgba(255, 68, 68, 0.1); border: 1px solid rgba(255, 68, 68, 0.2);
          color: #ff6b6b; padding: 12px; border-radius: 12px; margin-bottom: 20px; font-size: 0.85rem; text-align: center;
        }

        .auth-footer { text-align: center; margin-top: 30px; color: #888; font-size: 0.9rem; }
        .auth-footer a { color: #00e5ff; text-decoration: none; font-weight: 600; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default Login;
