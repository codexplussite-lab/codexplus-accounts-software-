const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const multer = require('multer');

// Configure multer for memory storage (file is kept in memory to be decrypted directly)
const upload = multer({ storage: multer.memoryStorage() });

router.get('/download', backupController.downloadBackup);
router.post('/restore', backupController.restoreBackup);

module.exports = router;
