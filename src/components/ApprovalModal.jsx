import React from 'react';

const ApprovalModal = ({ requests, onApprove, onReject }) => {
  if (requests.length === 0) return null;

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {requests.map(req => (
        <div key={req.socketId} style={{
          backgroundColor: 'var(--header-bg)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid var(--accent-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          minWidth: '250px'
        }}>
          <h4 style={{ margin: 0, color: 'white' }}>Join Request</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc' }}>
            <strong style={{ color: 'white' }}>{req.username}</strong> wants to join your room.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => onApprove(req)}
              style={{
                flex: 1, padding: '8px', backgroundColor: '#4caf50', 
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              Approve
            </button>
            <button 
              onClick={() => onReject(req)}
              style={{
                flex: 1, padding: '8px', backgroundColor: '#f44336', 
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'
              }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApprovalModal;
