const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, softVerifyToken } = require('../middlewares/authMiddleware');

router.get('/csrf/', (req, res) => { res.json({ csrfToken: 'dummy-token' }); });
router.get('/csrf', (req, res) => { res.json({ csrfToken: 'dummy-token' }); });

router.get('/me', softVerifyToken, async (req, res) => {
  if (!req.user) {
    return res.json({ is_authenticated: false });
  }

  let appLogo = null;
  try {
    const prisma = require('../prismaClient');
    const settings = await prisma.systemSetting.findFirst();
    if (settings && settings.appLogo) {
      appLogo = settings.appLogo;
    }
  } catch (e) { console.error(e); }

  res.json({
    is_authenticated: true,
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
    is_portal_admin: req.user.role === 'superadmin' || req.user.role === 'SUPERADMIN',
    company_name: req.user.company?.name,
    company_logo: req.user.company?.logoBase64,
    company_address: req.user.company?.address,
    appLogo: appLogo
  });
});

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
