const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

exports.verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if user is blocked or expired on every request to ensure strict access control
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id },
      include: { company: true }
    });
    
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Your account is blocked.' });
    }

    if (user.role !== 'SUPERADMIN' && user.company) {
      const company = user.company;
      
      // Auto-expire trials
      if (company.status === 'TRIAL' && company.expiryDate) {
        if (new Date() > new Date(company.expiryDate)) {
           await prisma.company.update({ where: { id: company.id }, data: { status: 'EXPIRED' }});
           company.status = 'EXPIRED';
        }
      }

      // Suspended/Blocked cannot login at all
      if (company.status === 'SUSPENDED' || company.status === 'BLOCKED') {
        return res.status(403).json({ error: `Your company account is ${company.status.toLowerCase()}.` });
      }

      // Expired can only GET (Read-Only)
      if (company.status === 'EXPIRED') {
        if (req.method !== 'GET') {
          return res.status(403).json({ error: 'Your subscription is expired. Read-only access.' });
        }
      }
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

exports.isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'SUPERADMIN') {
    next();
  } else {
    res.status(403).json({ error: 'Superadmin access required' });
  }
};

exports.isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'SUPERADMIN')) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

exports.softVerifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await prisma.user.findUnique({ 
      where: { id: decoded.id },
      include: { company: true }
    });
    
    if (!user || user.isBlocked) {
      req.user = null;
    } else {
      req.user = user;
    }
  } catch (error) {
    req.user = null;
  }
  next();
};
