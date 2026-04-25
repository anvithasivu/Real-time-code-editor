const pool = require('./config/db');

const debug = async () => {
  try {
    console.log('--- DATABASE DIAGNOSTIC ---');
    
    // 1. Check all rooms and their creators
    const rooms = await pool.query('SELECT id, creator_id FROM rooms');
    console.log('\nRooms in DB:', rooms.rows);

    // 2. Check all pending requests
    const requests = await pool.query('SELECT * FROM room_requests');
    console.log('\nAll Requests in DB:', requests.rows);

    // 3. Check user_rooms for ownership roles
    const userRooms = await pool.query('SELECT * FROM user_rooms');
    console.log('\nUser Roles in DB:', userRooms.rows);

    console.log('\n--- END DIAGNOSTIC ---');
    process.exit(0);
  } catch (err) {
    console.error('Debug failed:', err);
    process.exit(1);
  }
};

debug();
