const pool = require('./config/db');

const migrate = async () => {
  try {
    console.log('Starting migration...');

    // Add role column to user_rooms
    await pool.query('ALTER TABLE user_rooms ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT \'editor\'');

    // Create files table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        content TEXT DEFAULT '',
        language VARCHAR(50) DEFAULT 'javascript',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create room_snapshots table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_snapshots (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        snapshot_data JSONB NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create room_analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_analytics (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) REFERENCES rooms(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        lines_added INTEGER DEFAULT 0,
        edits_count INTEGER DEFAULT 0,
        active_duration_minutes INTEGER DEFAULT 0,
        last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(room_id, user_id)
      )
    `);

    // Create room_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_settings (
        room_id VARCHAR(255) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
        interview_mode BOOLEAN DEFAULT FALSE,
        share_token VARCHAR(255) UNIQUE,
        share_mode VARCHAR(20) DEFAULT 'private'
      )
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

migrate();
