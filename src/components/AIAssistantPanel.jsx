import React, { useState } from 'react';
import axios from 'axios';

const AIAssistantPanel = ({ code, fileName, onClose }) => {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    setLoading(true);
    setResponse('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/code/ai-assist', 
        { code, fileName, action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResponse(res.data.suggestion);
    } catch (err) {
      setResponse('Failed to get AI assistance. Please ensure your backend is connected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-panel" style={{
      width: '350px',
      backgroundColor: '#1e1e1e',
      borderLeft: '2px solid #333',
      display: 'flex',
      flexDirection: 'column',
      padding: '15px',
      color: 'white',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>AI Assistant</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button disabled={loading} onClick={() => handleAction('explain')} className="ai-btn">Explain</button>
        <button disabled={loading} onClick={() => handleAction('fix')} className="ai-btn">Fix Bugs</button>
        <button disabled={loading} onClick={() => handleAction('optimize')} className="ai-btn">Optimize</button>
      </div>

      <div style={{ 
        flex: 1, 
        backgroundColor: '#121212', 
        borderRadius: '8px', 
        padding: '15px', 
        overflowY: 'auto',
        fontSize: '0.9rem',
        lineHeight: '1.5',
        color: '#ccc',
        border: '1px solid #333'
      }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginTop: '50px' }}>
            <div className="loader" style={{ width: '30px', height: '30px' }}></div>
            <p>AI is thinking...</p>
          </div>
        ) : response ? (
          <div style={{ whiteSpace: 'pre-wrap' }}>{response}</div>
        ) : (
          <p style={{ color: '#555', textAlign: 'center', marginTop: '50px' }}>
            Select code or just click an action above to get help with your current file.
          </p>
        )}
      </div>

      <style>{`
        .ai-btn {
          flex: 1;
          background: #333;
          color: white;
          border: 1px solid #444;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          transition: all 0.3s;
        }
        .ai-btn:hover:not(:disabled) {
          background: var(--accent-color);
          border-color: var(--accent-color);
        }
        .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default AIAssistantPanel;
