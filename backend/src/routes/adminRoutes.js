const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isSuperAdmin } = require('../middlewares/authMiddleware');

router.use(verifyToken, isSuperAdmin);

// Dashboard stats
router.get('/dashboard', adminController.getDashboardStats);

// Companies
router.get('/companies', adminController.getCompanies);
router.get('/companies/:id', adminController.getCompany);
router.post('/companies', adminController.createCompany);
router.put('/companies/:id', adminController.updateCompany);
router.post('/companies/:id/status', adminController.changeCompanyStatus);

// Subscriptions
router.get('/subscriptions', adminController.getSubscriptions);
router.post('/subscriptions', adminController.createSubscription);
router.put('/subscriptions/:id', adminController.updateSubscription);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// Activity Logs
router.get('/logs', adminController.getActivityLogs);

// Backups
router.get('/backups/full', adminController.downloadFullBackup);
router.get('/backups/company/:id', adminController.downloadCompanyBackup);

// Passwords
router.post('/users/:id/reset_password', adminController.generateTempPassword);

module.exports = router;
