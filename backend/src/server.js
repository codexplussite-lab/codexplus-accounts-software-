const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/accounts', require('./routes/accountRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/parties', require('./routes/partyRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/dues', require('./routes/duePaymentRoutes'));
app.use('/api/stock', require('./routes/stockRoutes'));
app.use('/api/sales', require('./routes/saleRoutes'));
app.use('/api/notes', require('./routes/noteRoutes'));
app.use('/api/reports', require('./routes/reportsRoutes'));
app.use('/api/import', require('./routes/importRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/export-sales', require('./routes/exportSalesRoutes'));
app.use('/api/export-stock', require('./routes/exportStockRoutes'));
app.use('/api/backup', require('./routes/backupRoutes'));

// CSRF endpoint fix for frontend
app.get('/api/csrf', (req, res) => {
  res.json({ csrfToken: 'mock-csrf-token-12345' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Error Handler]', err);
  
  if (err.name === 'PrismaClientValidationError' || err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ error: 'Invalid data submitted.' });
  }
  
  res.status(500).json({ error: 'An internal server error occurred.' });
});

const PORT = process.env.PORT || 5000;
const prisma = require('./prismaClient');
const bcrypt = require('bcrypt');

async function initializeSuperAdmin() {
  try {
    const existing = await prisma.user.findUnique({ where: { username: 'moosa' } });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('moosasuperadmin', 10);
      await prisma.user.create({
        data: {
          username: 'moosa',
          password: hashedPassword,
          role: 'SUPERADMIN'
        }
      });
      console.log('Superadmin account created (moosa).');
    }
  } catch (error) {
    console.error('Failed to initialize superadmin:', error);
  }
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await initializeSuperAdmin();
});