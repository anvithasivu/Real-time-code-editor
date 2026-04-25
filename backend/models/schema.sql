-- PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

  CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(50) PRIMARY KEY,
    code TEXT DEFAULT '// Start coding...',
    language VARCHAR(20) DEFAULT 'javascript',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    creator_id INTEGER REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS user_rooms (
    user_id INTEGER REFERENCES users(id),
    room_id VARCHAR(50) REFERENCES rooms(id),
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, room_id)
  );

  CREATE TABLE IF NOT EXISTS room_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    room_id VARCHAR(50) REFERENCES rooms(id),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, room_id)
  );
