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
    room_id VARCHAR(255) REFERENCES rooms(id),
    role VARCHAR(20) DEFAULT 'editor', -- 'owner', 'editor', 'viewer'
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

CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content TEXT DEFAULT '',
    language VARCHAR(50) DEFAULT 'javascript',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_snapshots (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    snapshot_data JSONB NOT NULL, -- Stores state of all files
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_analytics (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    lines_added INTEGER DEFAULT 0,
    edits_count INTEGER DEFAULT 0,
    active_duration_minutes INTEGER DEFAULT 0,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_settings (
    room_id VARCHAR(255) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    interview_mode BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(255) UNIQUE,
    share_mode VARCHAR(20) DEFAULT 'private' -- 'private', 'public_view', 'public_edit'
);
