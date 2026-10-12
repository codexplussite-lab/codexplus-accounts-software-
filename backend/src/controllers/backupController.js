const prisma = require('../prismaClient');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.BACKUP_SECRET_KEY || 'aVerySecretKey123456789012345678'; // 32 bytes required for AES-256
const IV_LENGTH = 16;

// Helper to ensure secret key is exactly 32 bytes
const getKey = () => {
  return crypto.createHash('sha256').update(String(SECRET_KEY)).digest('base64').substring(0, 32);
};

const getBackupFilePath = () => {
    const dir = 'C:\\codexplus_accounts_backups';
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return path.join(dir, 'backup.osbackup');
};

exports.downloadBackup = async (req, res) => {
  try {
    // 1. Fetch all data from database
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      models: {
        Company: await prisma.company.findMany(),
        User: await prisma.user.findMany(),
        Account: await prisma.account.findMany(),
        Category: await prisma.category.findMany(),
        Party: await prisma.party.findMany(),
        Transaction: await prisma.transaction.findMany(),
        DuePayment: await prisma.duePayment.findMany(),
        Note: await prisma.note.findMany(),
        Stock: await prisma.stock.findMany(),
        Sale: await prisma.sale.findMany(),
      }
    };

    const jsonString = JSON.stringify(data);

    // 2. Encrypt the data
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    let encrypted = cipher.update(jsonString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend IV to the encrypted string (need it for decryption)
    const encryptedData = iv.toString('hex') + ':' + encrypted;

    // 3. Save to local disk
    const filePath = getBackupFilePath();
    fs.writeFileSync(filePath, encryptedData);

    res.json({ success: true, message: `Backup saved successfully to ${filePath}` });

  } catch (error) {
    console.error('Backup Download Error:', error);
    res.status(500).json({ error: 'Failed to generate backup' });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const filePath = getBackupFilePath();
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: `No backup found at ${filePath}` });
    }

    const encryptedData = fs.readFileSync(filePath, 'utf8');
    
    // 1. Decrypt data
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid backup file format' });
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    let decryptedString;
    try {
      const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
      decryptedString = decipher.update(encryptedText, 'hex', 'utf8');
      decryptedString += decipher.final('utf8');
    } catch (err) {
      return res.status(400).json({ error: 'Failed to decrypt backup. Invalid file or corrupted data.' });
    }

    const data = JSON.parse(decryptedString);

    if (!data.models) {
      return res.status(400).json({ error: 'Invalid backup content' });
    }

    // 2. Restore data using a transaction
    await prisma.$transaction(async (tx) => {
      // Clean all tables safely using TRUNCATE CASCADE for Postgres
      await tx.$executeRawUnsafe(`TRUNCATE TABLE "Sale", "Stock", "Note", "DuePayment", "Transaction", "Party", "Category", "Account", "User", "Company" RESTART IDENTITY CASCADE;`);

      // Insert data in correct dependency order
      if (data.models.Company?.length) await tx.company.createMany({ data: data.models.Company });
      if (data.models.User?.length) await tx.user.createMany({ data: data.models.User });
      if (data.models.Account?.length) await tx.account.createMany({ data: data.models.Account });
      if (data.models.Category?.length) await tx.category.createMany({ data: data.models.Category });
      if (data.models.Party?.length) await tx.party.createMany({ data: data.models.Party });
      if (data.models.Transaction?.length) await tx.transaction.createMany({ data: data.models.Transaction });
      if (data.models.DuePayment?.length) await tx.duePayment.createMany({ data: data.models.DuePayment });
      if (data.models.Note?.length) await tx.note.createMany({ data: data.models.Note });
      if (data.models.Stock?.length) await tx.stock.createMany({ data: data.models.Stock });
      if (data.models.Sale?.length) await tx.sale.createMany({ data: data.models.Sale });
    });

    res.json({ success: true, message: 'Database restored successfully' });

  } catch (error) {
    console.error('Backup Restore Error:', error);
    res.status(500).json({ error: 'Failed to restore backup: ' + error.message });
  }
};
