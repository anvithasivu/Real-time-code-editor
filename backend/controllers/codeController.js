const pool = require('../config/db');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

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
    } else if (language === 'cpp') {
      stderr = 'C++ compilation requires g++ to be installed on the host machine. Local execution for C++ is currently disabled.';
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
