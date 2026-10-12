const express = require('express');
const router = express.Router();
const controller = require('../controllers/partysController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.use(verifyToken);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.patch('/:id', controller.update);
router.delete('/:id', controller.remove);
router.get('/:id/history', controller.getHistory);

module.exports = router;
