import React from 'react';

const UsersList = ({ users }) => {
  return (
    <div className="users-list-container">
      <h3 className="sidebar-title">Active Users ({users.length})</h3>
      <ul className="users-list">
        {users.map((user) => (
          <li key={user.socketId} className="user-item">
            <div className="user-info">
              <span className="user-status-dot"></span>
              <span className="username">{user.username}</span>
            </div>
            {user.cursor && (
              <span className="cursor-pos">
                Ln {user.cursor.lineNumber}, Col {user.cursor.column}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UsersList;
