const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
let prisma;

if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) {
  try {
    const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
    const adapter = new PrismaBetterSqlite3({ url: dbUrl });
    prisma = new PrismaClient({ adapter });
  } catch (e) {
    prisma = new PrismaClient();
  }
} else {
  prisma = new PrismaClient();
}

module.exports = prisma;
