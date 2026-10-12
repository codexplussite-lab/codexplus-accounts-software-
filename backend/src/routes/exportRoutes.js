
const express = require('express');
const router = express.Router();
const controller = require('../controllers/exportController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);
router.get('/:type', controller.exportTransactions);

module.exports = router;
