const pool = require('./config/db');

const fixCascade = async () => {
  try {
    console.log('Updating database constraints to support cascading deletes...');

    // Drop and recreate user_rooms constraint
    await pool.query(`
      ALTER TABLE user_rooms 
      DROP CONSTRAINT IF EXISTS user_rooms_room_id_fkey,
      ADD CONSTRAINT user_rooms_room_id_fkey 
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    `);

    // Drop and recreate room_requests constraint
    await pool.query(`
      ALTER TABLE room_requests 
      DROP CONSTRAINT IF EXISTS room_requests_room_id_fkey,
      ADD CONSTRAINT room_requests_room_id_fkey 
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
    `);

    console.log('Database constraints updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to update constraints:', err);
    process.exit(1);
  }
};

fixCascade();
