
const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboardController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/', controller.getDashboard);

module.exports = router;
