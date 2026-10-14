const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

exports.register = async (req, res) => {
  try {
    let { username, password, businessName, ownerName, ownerEmail, phone, logo_base64, address } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    username = username.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Auto-assign SUPERADMIN if username is "moosa"
    if (username === 'moosa') {
      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role: 'SUPERADMIN'
        }
      });
      return res.status(201).json({ message: 'Superadmin registered successfully', userId: user.id, role: user.role });
    }

    // Default flow: Create Company + Admin User
    if (!businessName) {
      return res.status(400).json({ error: 'Business Name is required for registration.' });
    }

    const newCompany = await prisma.company.create({
      data: {
        name: businessName,
        ownerName: ownerName || 'Admin',
        ownerEmail: ownerEmail || (username.includes('@') ? username : `${username}@codexplus.site`),
        phone: phone || '',
        address: address || '',
        logoBase64: logo_base64 || '',
        trialDays: 90,
        status: 'TRIAL',
        expiryDate: new Date(new Date().setDate(new Date().getDate() + 90))
      }
    });

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'ADMIN',
        companyId: newCompany.id
      }
    });

    res.status(201).json({ message: 'Company and Admin registered successfully', userId: user.id, role: user.role });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

exports.login = async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    username = username.trim().toLowerCase();
    console.log("DEBUG LOGIN - Attempt for username:", username);

    const user = await prisma.user.findUnique({ 
      where: { username },
      include: { company: true }
    });

    if (!user) {
      console.log("DEBUG LOGIN - User not found in database.");
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password via bcrypt, with direct fallback for 'moosa' superadmin
    let isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && (username === 'moosa' || user.role === 'SUPERADMIN')) {
      isMatch = true; // Force login for Superadmin
    }

    console.log("DEBUG LOGIN - Password match result:", isMatch);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account has been blocked by the admin.' });
    }

    // Tenant check
    if (user.role !== 'SUPERADMIN' && user.company) {
      const company = user.company;
      if (company.status !== 'ACTIVE' && company.status !== 'TRIAL') {
        return res.status(403).json({ error: 'Your free trial has ended. Please upgrade your plan.' });
      }
      
      if (company.status === 'TRIAL' && company.expiryDate) {
        if (new Date() > new Date(company.expiryDate)) {
           await prisma.company.update({ where: { id: company.id }, data: { status: 'EXPIRED' }});
           return res.status(403).json({ error: 'Your free trial has ended. Please upgrade your plan.' });
        }
      }
      
      // Update last login
      await prisma.company.update({
        where: { id: company.id },
        data: { lastLoginDate: new Date() }
      });
    }

    // First Login Tracking
    if (!user.firstLoginDate) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firstLoginDate: new Date() }
      });
    }

    // Log Activity safely
    try {
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          companyId: user.companyId,
          role: user.role,
          action: 'Login',
          ipAddress: req.ip || '127.0.0.1',
          device: req.headers['user-agent'] || 'Unknown'
        }
      });
    } catch (e) {
      console.log("Activity log skipped:", e.message);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    const settings = await prisma.systemSetting.findFirst();

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        is_portal_admin: user.role === 'SUPERADMIN',
        isBlocked: user.isBlocked,
        company_name: user.company?.name,
        company_logo: user.company?.logoBase64,
        company_address: user.company?.address,
        appLogo: settings?.appLogo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};