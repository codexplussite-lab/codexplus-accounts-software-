const prisma = require('../prismaClient');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalCompanies = await prisma.company.count();
    const activeCompanies = await prisma.company.count({ where: { status: 'ACTIVE' } });
    const trialCompanies = await prisma.company.count({ where: { status: 'TRIAL' } });
    const expiredCompanies = await prisma.company.count({ where: { status: 'EXPIRED' } });
    const suspendedCompanies = await prisma.company.count({ where: { status: { in: ['SUSPENDED', 'BLOCKED'] } } });
    const totalUsers = await prisma.user.count({ where: { role: { not: 'SUPERADMIN' } } });
    
    // Today's Logins
    const today = new Date();
    today.setHours(0,0,0,0);
    const todaysLogins = await prisma.activityLog.count({
      where: {
        action: 'Login',
        createdAt: { gte: today }
      }
    });

    // Database size (SQLite dev.db)
    let dbSizeMB = 0;
    try {
      const fs = require('fs');
      const path = require('path');
      const stats = fs.statSync(path.join(__dirname, '../../prisma/dev.db'));
      dbSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    } catch(e) { }

    const recentActivity = await prisma.activityLog.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { company: true, user: true } });
    const latestCompanies = await prisma.company.findMany({ take: 5, orderBy: { createdAt: 'desc' } });

    res.json({
      totalCompanies,
      activeCompanies,
      trialCompanies,
      expiredCompanies,
      suspendedCompanies,
      totalUsers,
      todaysLogins,
      dbSizeMB,
      revenuePlaceholder: 'PKR 0.00',
      recentActivity: recentActivity.map(a => ({
        id: a.id,
        action: a.action,
        user: a.user?.username,
        company: a.company?.name,
        date: a.createdAt
      })),
      latestCompanies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      include: { subscriptionPlan: true, users: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCompany = async (req, res) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: Number(req.params.id) },
      include: { users: true, subscriptionPlan: true }
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCompany = async (req, res) => {
  try {
    const { name, ownerName, ownerEmail, phone, trialDays } = req.body;
    const company = await prisma.company.create({
      data: {
        name, ownerName, ownerEmail, phone, trialDays: trialDays || 14,
        status: 'TRIAL',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + (trialDays || 14)))
      }
    });
    res.status(201).json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const data = req.body;
    const company = await prisma.company.update({
      where: { id: Number(req.params.id) },
      data: {
        name: data.name,
        ownerName: data.ownerName,
        phone: data.phone,
        address: data.address,
        country: data.country,
        city: data.city,
        website: data.website,
        businessType: data.businessType,
        currency: data.currency,
        timezone: data.timezone,
        maxUsers: Number(data.maxUsers) || undefined,
        storageLimit: Number(data.storageLimit) || undefined,
        subscriptionPlanId: data.subscriptionPlanId ? Number(data.subscriptionPlanId) : null
      }
    });
    res.json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.changeCompanyStatus = async (req, res) => {
  try {
    const { status } = req.body; // ACTIVE, INACTIVE, TRIAL, EXPIRED, SUSPENDED, BLOCKED
    const company = await prisma.company.update({
      where: { id: Number(req.params.id) },
      data: { status }
    });
    res.json(company);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSubscriptions = async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany();
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const data = req.body;
    const plan = await prisma.subscriptionPlan.create({ data });
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    const data = req.body;
    const plan = await prisma.subscriptionPlan.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await prisma.systemSetting.create({ data: {} });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const data = req.body;
    
    // Change Superadmin password if provided
    if (data.newSuperadminPassword) {
      const hashedPassword = await bcrypt.hash(data.newSuperadminPassword, 10);
      await prisma.user.updateMany({
        where: { role: 'SUPERADMIN' },
        data: { password: hashedPassword }
      });
      delete data.newSuperadminPassword;
    }

    const settings = await prisma.systemSetting.findFirst();
    const updated = await prisma.systemSetting.update({
      where: { id: settings.id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.getActivityLogs = async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: true, company: true }
    });
    res.json(logs.map(l => ({
      id: l.id,
      user: l.user?.username,
      company: l.company?.name,
      role: l.role,
      action: l.action,
      ip: l.ipAddress,
      device: l.device,
      date: l.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ==========================================
// Backup Management
// ==========================================

const fs = require('fs');
const path = require('path');

exports.downloadFullBackup = async (req, res) => {
  try {
    // The SQLite DB is located at prisma/dev.db
    const dbPath = path.join(__dirname, '../../prisma/dev.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database file not found.' });
    }
    res.download(dbPath, `backup_full_${new Date().toISOString().split('T')[0]}.sqlite`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to download full backup' });
  }
};

exports.downloadCompanyBackup = async (req, res) => {
  try {
    const companyId = Number(req.params.id);
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: {
        users: true, accounts: true, categories: true, parties: true,
        transactions: true, duePayments: true, notes: true, stocks: true, sales: true
      }
    });

    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    res.setHeader('Content-disposition', `attachment; filename=backup_company_${companyId}_${new Date().toISOString().split('T')[0]}.json`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(company, null, 2));
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate company backup' });
  }
};

// ==========================================
// Password Management
// ==========================================
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.generateTempPassword = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Use provided password or generate secure temp password
    const newPassword = req.body.newPassword || crypto.randomBytes(8).toString('hex');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save hash. Force password change flag could be added to schema, but for now we just reset.
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ 
      message: req.body.newPassword ? 'Password updated successfully' : 'Temporary password generated', 
      tempPassword: req.body.newPassword ? null : newPassword 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update password' });
  }
};
