const express = require('express');
const router = express.Router();
const controller = require('../controllers/reportsController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', controller.getReports);

module.exports = router;
