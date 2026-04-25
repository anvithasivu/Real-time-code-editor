const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/create-room', authenticateToken, codeController.createRoom);
router.get('/my-rooms', authenticateToken, codeController.getMyRooms);
router.post('/save', authenticateToken, codeController.saveCode);
router.get('/load/:roomId', authenticateToken, codeController.loadCode);
router.post('/run', authenticateToken, codeController.runCode);

// New Room Request Routes
router.post('/join-request', authenticateToken, codeController.createJoinRequest);
router.get('/pending-requests', authenticateToken, codeController.getPendingRequests);
router.post('/update-request', authenticateToken, codeController.updateRequestStatus);
router.get('/request-status/:roomId', authenticateToken, codeController.checkRequestStatus);

module.exports = router;
