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

    // Initialize default main file
    await pool.query(
      'INSERT INTO files (room_id, name, content, language) VALUES ($1, $2, $3, $4)',
      [roomId, 'main.js', '// Start coding...', 'javascript']
    );

    await pool.query(
      `INSERT INTO user_rooms (user_id, room_id, role) VALUES ($1, $2, $3)
       ON CONFLICT (user_id, room_id) DO UPDATE SET last_accessed = CURRENT_TIMESTAMP, role = $3`,
      [userId, roomId, 'owner']
    );

    res.status(201).json({ success: true, message: 'Room created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create room.' });
  }
};

exports.getFiles = async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM files WHERE room_id = $1 ORDER BY created_at ASC', [roomId]);
    
    // If no files exist (e.g. for old rooms), create a default one
    if (result.rows.length === 0) {
      const newFile = await pool.query(
        'INSERT INTO files (room_id, name, content, language) VALUES ($1, $2, $3, $4) RETURNING *',
        [roomId, 'main.js', '// Start coding...', 'javascript']
      );
      return res.json({ files: newFile.rows });
    }

    res.json({ files: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch files.' });
  }
};

exports.createFile = async (req, res) => {
  const { roomId, name, language } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO files (room_id, name, content, language) VALUES ($1, $2, $3, $4) RETURNING *',
      [roomId, name, '', language || 'javascript']
    );
    res.status(201).json({ file: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create file.' });
  }
};

exports.updateRequestStatus = async (req, res) => {
  const { requestId, status } = req.body;
  const adminId = req.user.id;

  try {
    // 1. Verify that the requester is the owner of the room
    const requestCheck = await pool.query(
      `SELECT rr.*, r.creator_id FROM room_requests rr 
       JOIN rooms r ON rr.room_id = r.id 
       WHERE rr.id = $1`, [requestId]
    );

    if (requestCheck.rows.length === 0) return res.status(404).json({ error: 'Request not found.' });
    const request = requestCheck.rows[0];

    if (request.creator_id !== adminId) {
      return res.status(403).json({ error: 'Only the room creator can manage requests.' });
    }

    // 2. Update request status
    await pool.query('UPDATE room_requests SET status = $1 WHERE id = $2', [status, requestId]);

    // 3. If approved, add to user_rooms for persistence
    if (status === 'approved') {
      await pool.query(
        `INSERT INTO user_rooms (user_id, room_id, role) VALUES ($1, $2, 'editor') 
         ON CONFLICT (user_id, room_id) DO UPDATE SET role = 'editor'`,
        [request.user_id, request.room_id]
      );

      // Notify the user in real-time
      const io = req.app.get('io');
      if (io) {
        io.emit('request-approved-direct', { 
          userId: request.user_id, 
          roomId: request.room_id 
        });
      }
    }

    res.json({ success: true, message: `Request ${status} successfully.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update request.' });
  }
};

exports.deleteFile = async (req, res) => {
  const { fileId } = req.params;
  try {
    await pool.query('DELETE FROM files WHERE id = $1', [fileId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
};

exports.saveFile = async (req, res) => {
  const { fileId, content, roomId } = req.body;
  const userId = req.user.id;
  try {
    // Basic Analytics: Increment edit count
    await pool.query(
      'INSERT INTO room_analytics (room_id, user_id, edits_count) VALUES ($1, $2, 1) ON CONFLICT (room_id, user_id) DO UPDATE SET edits_count = room_analytics.edits_count + 1, last_active = CURRENT_TIMESTAMP',
      [roomId, userId]
    );

    await pool.query(
      'UPDATE files SET content = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [content, fileId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save file.' });
  }
};

exports.createSnapshot = async (req, res) => {
  const { roomId } = req.body;
  const userId = req.user.id;
  try {
    const filesResult = await pool.query('SELECT name, content, language FROM files WHERE room_id = $1', [roomId]);
    const snapshotData = JSON.stringify(filesResult.rows);
    
    await pool.query(
      'INSERT INTO room_snapshots (room_id, user_id, snapshot_data) VALUES ($1, $2, $3)',
      [roomId, userId, snapshotData]
    );
    res.json({ success: true, message: 'Snapshot created.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create snapshot.' });
  }
};

exports.getSnapshots = async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      'SELECT rs.*, u.username FROM room_snapshots rs JOIN users u ON rs.user_id = u.id WHERE rs.room_id = $1 ORDER BY rs.timestamp DESC',
      [roomId]
    );
    res.json({ snapshots: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch snapshots.' });
  }
};

exports.getAnalytics = async (req, res) => {
  const { roomId } = req.params;
  try {
    const result = await pool.query(
      'SELECT ra.*, u.username FROM room_analytics ra JOIN users u ON ra.user_id = u.id WHERE ra.room_id = $1',
      [roomId]
    );
    res.json({ analytics: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch analytics.' });
  }
};

exports.updateUserRole = async (req, res) => {
  const { roomId, targetUserId, role } = req.body;
  const ownerId = req.user.id;

  try {
    const check = await pool.query('SELECT role FROM user_rooms WHERE user_id = $1 AND room_id = $2', [ownerId, roomId]);
    if (check.rows.length === 0 || check.rows[0].role !== 'owner') {
      return res.status(403).json({ error: 'Only owners can change roles.' });
    }

    await pool.query(
      'UPDATE user_rooms SET role = $1 WHERE user_id = $2 AND room_id = $3',
      [role, targetUserId, roomId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update role.' });
  }
};

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.aiAssist = async (req, res) => {
  const { code, fileName, action } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const prompt = `
        You are an expert AI coding assistant inside CodeFusion Sync.
        File: ${fileName}
        Action: ${action.toUpperCase()}
        Code:
        \`\`\`
        ${code}
        \`\`\`
        
        Provide a concise, professional response. If the action is FIX, provide the corrected code snippet. 
        If it's EXPLAIN, explain the logic. If it's OPTIMIZE, suggest performance improvements.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return res.json({ suggestion: response.text() });
    } catch (err) {
      console.error("Gemini API Error:", err.message);
      // Fallback to simulation if API fails
    }
  }
  
  // Simulated AI Logic Fallback
  let suggestion = "";
  const language = fileName.split('.').pop();

  if (action === 'explain') {
    suggestion = `(Simulated) This ${language} code defines the core functionality in ${fileName}. It handles logic flow and data processing.`;
  } else if (action === 'fix') {
    suggestion = `(Simulated) Checking for bugs in ${fileName}... Ensure all variables are declared and syntax is correct for ${language}.`;
  } else if (action === 'optimize') {
    suggestion = `(Simulated) Suggestion for ${fileName}: Refactor any nested loops and use modern ${language} patterns for better performance.`;
  }

  res.json({ suggestion });
};

exports.getMyRooms = async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT r.id, r.last_updated, r.creator_id, ur.last_accessed 
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

    // Get the owner's socket to notify them
    // Note: We broadcast to the room so any owner/admin in the room can see it
    // But since the owner is likely on the dashboard, we emit a global event
    const username = req.user.username;
    const io = req.app.get('io');
    if (io) {
      io.emit('incoming-request-global', { 
        id: Date.now(), // temporary ID for UI
        user_id: userId, 
        username: username, 
        room_id: roomId 
      });
    }

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
    // Check if user is already in the room
    const userRoom = await pool.query('SELECT role FROM user_rooms WHERE user_id = $1 AND room_id = $2', [userId, roomId]);
    
    if (userRoom.rows.length > 0) {
      return res.json({ status: 'approved', role: userRoom.rows[0].role });
    }

    // Check if room exists and if user is the creator (backup check)
    const roomResult = await pool.query('SELECT creator_id FROM rooms WHERE id = $1', [roomId]);
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    if (roomResult.rows[0].creator_id === userId) {
      // Auto-join if creator but not in user_rooms for some reason
      await pool.query('INSERT INTO user_rooms (user_id, room_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [userId, roomId, 'owner']);
      return res.json({ status: 'approved', role: 'owner' });
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

exports.deleteRoom = async (req, res) => {
  const { roomId } = req.params;
  const userId = req.user.id;

  try {
    const roomCheck = await pool.query('SELECT creator_id FROM rooms WHERE id = $1', [roomId]);
    if (roomCheck.rows.length === 0) return res.status(404).json({ error: 'Room not found.' });

    // Ensure we compare as numbers
    if (Number(roomCheck.rows[0].creator_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Only the room creator can delete this workspace.' });
    }

    await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    res.json({ success: true, message: 'Room deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete room.' });
  }
};
