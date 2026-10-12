
const express = require('express');
const router = express.Router();
const multer = require('multer');
const importController = require('../controllers/importController');

const upload = multer({ dest: 'uploads/' });

router.post('/transactions/', upload.single('file'), importController.importTransactions);
router.post('/sales/', upload.single('file'), importController.importSales);
router.post('/stock/', upload.single('file'), importController.importStock);

module.exports = router;
