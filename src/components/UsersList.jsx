import React from 'react';

const UsersList = ({ users, typingUsers = [] }) => {
  return (
    <div className="users-list" style={{ padding: '15px', borderBottom: '1px solid #333', maxHeight: '200px', overflowY: 'auto' }}>
      <h3 style={{ fontSize: '0.9rem', color: '#888', marginBottom: '10px' }}>ACTIVE USERS</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map((user) => (
          <div key={user.socketId} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#4caf50'
            }}></div>
            <span style={{ fontSize: '0.9rem', color: 'white' }}>
              {user.username} {user.userId === parseInt(localStorage.getItem('userId')) ? '(You)' : ''}
              {typingUsers.includes(user.username) && (
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-color)', marginLeft: '5px', fontStyle: 'italic' }}>
                  typing...
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UsersList;
