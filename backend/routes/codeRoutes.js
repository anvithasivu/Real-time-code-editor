const express = require('express');
const router = express.Router();
const codeController = require('../controllers/codeController');
const authenticateToken = require('../middleware/authMiddleware');

router.post('/create', authenticateToken, codeController.createRoom);
router.get('/my-rooms', authenticateToken, codeController.getMyRooms);
router.post('/save', authenticateToken, codeController.saveCode);
router.get('/load/:roomId', authenticateToken, codeController.loadCode);
router.post('/run', authenticateToken, codeController.runCode);

// New Room Request Routes
router.post('/join-request', authenticateToken, codeController.createJoinRequest);
router.get('/pending-requests', authenticateToken, codeController.getPendingRequests);
router.post('/update-request', authenticateToken, codeController.updateRequestStatus);
router.get('/request-status/:roomId', authenticateToken, codeController.checkRequestStatus);

// Multi-file and Roles
router.get('/files/:roomId', authenticateToken, codeController.getFiles);
router.post('/create-file', authenticateToken, codeController.createFile);
router.delete('/delete-file/:fileId', authenticateToken, codeController.deleteFile);
router.post('/save-file', authenticateToken, codeController.saveFile);
router.post('/update-role', authenticateToken, codeController.updateUserRole);

// Snapshots & Analytics
router.post('/create-snapshot', authenticateToken, codeController.createSnapshot);
router.get('/snapshots/:roomId', authenticateToken, codeController.getSnapshots);
router.get('/analytics/:roomId', authenticateToken, codeController.getAnalytics);
router.post('/ai-assist', authenticateToken, codeController.aiAssist);
router.delete('/delete-room/:roomId', authenticateToken, codeController.deleteRoom);

module.exports = router;
