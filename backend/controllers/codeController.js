const pool = require('../config/db');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

exports.createRoom = async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;

  if (!roomId) return res.status(400).json({ error: 'Room ID is required.' });

  try {
    const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    if (result.rows.length > 0) {
      return res.status(400).json({ error: 'Room already exists.' });
    }

    await pool.query(
      `INSERT INTO rooms (id, code, language, creator_id) VALUES ($1, $2, $3, $4)`,
      [roomId, '// Start coding...', 'javascript', userId]
    );

    await pool.query(
      `INSERT INTO user_rooms (user_id, room_id) VALUES ($1, $2)
       ON CONFLICT (user_id, room_id) DO UPDATE SET last_accessed = CURRENT_TIMESTAMP`,
      [userId, roomId]
    );

    res.status(201).json({ success: true, message: 'Room created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create room.' });
  }
};

exports.getMyRooms = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT r.id, r.last_updated, ur.last_accessed 
       FROM user_rooms ur 
       JOIN rooms r ON ur.room_id = r.id 
       WHERE ur.user_id = $1 
       ORDER BY ur.last_accessed DESC`,
      [userId]
    );
    res.json({ rooms: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rooms.' });
  }
};

exports.saveCode = async (req, res) => {
  const { roomId, code, language } = req.body;
  if (!roomId || !code) return res.status(400).json({ error: 'Room ID and code are required.' });

  try {
    await pool.query(
      `INSERT INTO rooms (id, code, language, last_updated) 
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
       ON CONFLICT (id) DO UPDATE SET code = $2, language = $3, last_updated = CURRENT_TIMESTAMP`,
      [roomId, code, language || 'javascript']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Save code error (DB may not be setup):', err.message);
    res.json({ success: true, warning: 'Database error ignored' });
  }
};

exports.loadCode = async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query('SELECT code, language FROM rooms WHERE id = $1', [roomId]);
    if (result.rows.length > 0) {
      res.json({ code: result.rows[0].code, language: result.rows[0].language });
    } else {
      res.json({ code: '// Start coding...', language: 'javascript' });
    }
  } catch (err) {
    console.error('Load code error (DB may not be setup):', err.message);
    res.json({ code: '// Start coding...', language: 'javascript' });
  }
};

exports.runCode = async (req, res) => {
  const { code, language } = req.body;
  
  if (!code || !language) return res.status(400).json({ error: 'Code and language are required.' });

  try {
    let stdout = '';
    let stderr = '';
    const tempDir = path.join(__dirname, '..', 'temp');
    
    try { await fs.mkdir(tempDir); } catch(e) {}

    const filename = `code_${Date.now()}_${Math.floor(Math.random()*1000)}`;
    
    if (language === 'javascript') {
      const filepath = path.join(tempDir, `${filename}.js`);
      await fs.writeFile(filepath, code);
      try {
        const { stdout: out, stderr: err } = await execPromise(`node "${filepath}"`, { timeout: 5000 });
        stdout = out;
        stderr = err;
      } catch (err) {
        stderr = err.stderr || err.message;
      }
      await fs.unlink(filepath).catch(()=>{});
    } else if (language === 'python') {
      const filepath = path.join(tempDir, `${filename}.py`);
      await fs.writeFile(filepath, code);
      try {
        const { stdout: out, stderr: err } = await execPromise(`python "${filepath}"`, { timeout: 5000 });
        stdout = out;
        stderr = err;
      } catch (err) {
        stderr = err.stderr || err.message;
      }
      await fs.unlink(filepath).catch(()=>{});
    } else if (language === 'sql') {
      try {
        const result = await pool.query(code);
        if (result.command === 'SELECT') {
          stdout = JSON.stringify(result.rows, null, 2);
        } else {
          stdout = `${result.command} successful. ${result.rowCount || 0} rows affected.`;
        }
      } catch (err) {
        stderr = err.message;
      }
    } else {
      return res.status(400).json({ error: 'Unsupported language.' });
    }

    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      compile_output: ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to execute code.' });
  }
};

exports.createJoinRequest = async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;

  try {
    await pool.query(
      'INSERT INTO room_requests (user_id, room_id, status) VALUES ($1, $2, \'pending\') ON CONFLICT (user_id, room_id) DO UPDATE SET status = \'pending\', created_at = CURRENT_TIMESTAMP',
      [userId, roomId]
    );
    res.json({ success: true, message: 'Request sent successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send join request.' });
  }
};

exports.getPendingRequests = async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT rr.id, rr.user_id, rr.room_id, u.username 
       FROM room_requests rr 
       JOIN users u ON rr.user_id = u.id 
       JOIN rooms r ON rr.room_id = r.id 
       WHERE r.creator_id = $1 AND rr.status = 'pending'`,
      [userId]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending requests.' });
  }
};

exports.updateRequestStatus = async (req, res) => {
  const { requestId, status } = req.body;
  const creatorId = req.user.id;

  try {
    // Verify that the person updating the status is actually the room owner
    const checkResult = await pool.query(
      `SELECT rr.user_id, rr.room_id FROM room_requests rr 
       JOIN rooms r ON rr.room_id = r.id 
       WHERE rr.id = $1 AND r.creator_id = $2`,
      [requestId, creatorId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { user_id: targetUserId, room_id: roomId } = checkResult.rows[0];

    await pool.query('UPDATE room_requests SET status = $1 WHERE id = $2', [status, requestId]);

    if (status === 'approved') {
      await pool.query(
        `INSERT INTO user_rooms (user_id, room_id) VALUES ($1, $2)
         ON CONFLICT (user_id, room_id) DO UPDATE SET last_accessed = CURRENT_TIMESTAMP`,
        [targetUserId, roomId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request status.' });
  }
};

exports.checkRequestStatus = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const roomResult = await pool.query('SELECT creator_id FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomResult.rows[0].creator_id === userId) {
      return res.json({ status: 'owner' });
    }

    const result = await pool.query(
      'SELECT status FROM room_requests WHERE user_id = $1 AND room_id = $2',
      [userId, roomId]
    );

    if (result.rows.length > 0) {
      res.json({ status: result.rows[0].status });
    } else {
      res.json({ status: 'none' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to check request status.' });
  }
};
