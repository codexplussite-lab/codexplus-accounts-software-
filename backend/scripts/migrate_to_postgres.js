const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://'))) {
    console.error('❌ Error: DATABASE_URL must be a valid PostgreSQL connection string.');
    console.error('Example: DATABASE_URL="postgresql://AuditIQ:BrtbprGLj8SDMaGf@localhost:5432/auditiq?schema=public"');
    process.exit(1);
  }

  console.log('🚀 Step 1: Pushing Prisma Schema to PostgreSQL...');
  try {
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: dbUrl }
    });
    console.log('✅ Schema tables successfully synced to PostgreSQL!');
  } catch (err) {
    console.error('❌ Failed to push schema to PostgreSQL:', err.message);
    process.exit(1);
  }

  const dumpPath = path.join(__dirname, '..', 'auditiq_postgres_dump.sql');
  if (!fs.existsSync(dumpPath)) {
    console.error(`❌ Dump file not found at: ${dumpPath}`);
    process.exit(1);
  }

  console.log('🚀 Step 2: Importing Data Dump into PostgreSQL tables...');
  const client = new Client({ connectionString: dbUrl });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database.');

    const sqlContent = fs.readFileSync(dumpPath, 'utf-8');
    await client.query(sqlContent);
    console.log('✅ Data dump successfully executed!');

    console.log('\n📊 Verifying Record Counts in PostgreSQL:');
    const tables = ['SubscriptionPlan', 'Company', 'User', 'Account', 'Category', 'Party', 'Stock', 'Transaction', 'Sale', 'SystemSetting'];
    for (const tbl of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM "${tbl}";`);
        console.log(` - "${tbl}": ${res.rows[0].count} records`);
      } catch (e) {
        // Ignore table check if missing
      }
    }

    console.log('\n🎉 ALL DONE! Your database is fully migrated to PostgreSQL.');
  } catch (err) {
    console.error('❌ Error during data import:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
