const prisma = require('../prismaClient');

exports.logActivity = async (req, action) => {
  if (!req || !req.user) return;
  try {
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        companyId: req.user.companyId,
        role: req.user.role,
        action: action,
        ipAddress: req.ip || '',
        device: req.headers['user-agent'] || ''
      }
    });
  } catch (error) {
    console.error("Failed to log activity:", error.message);
  }
};
