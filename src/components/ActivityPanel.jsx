import React, { useEffect, useRef } from 'react';

const ActivityPanel = ({ activities }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activities]);

  return (
    <div className="activity-panel" style={{
      flex: 1,
      backgroundColor: '#1e1e1e',
      borderTop: '2px solid #333',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      padding: '10px'
    }}>
      <div style={{ color: '#888', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        <span>ACTIVITY LOG</span>
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>Recent Edits</span>
      </div>
      
      <div 
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        {activities.length === 0 ? (
          <div style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No activity yet...</div>
        ) : (
          activities.map((act) => (
            <div key={act.id} style={{
              fontSize: '0.8rem',
              color: '#ccc',
              backgroundColor: '#252525',
              padding: '6px 10px',
              borderRadius: '4px',
              borderLeft: '3px solid var(--accent-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start'
            }}>
              <span>{act.text}</span>
              <small style={{ color: '#666', marginLeft: '10px', flexShrink: 0 }}>{act.timestamp}</small>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityPanel;
