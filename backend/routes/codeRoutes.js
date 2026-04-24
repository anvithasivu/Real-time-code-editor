const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/save', authenticateToken, codeController.saveCode);
router.get('/load/:roomId', authenticateToken, codeController.loadCode);
router.post('/run', authenticateToken, codeController.runCode);

module.exports = router;
