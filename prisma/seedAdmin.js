/**
 * Creates (or updates) the admin user with a bcrypt password.
 * Run once:   node prisma/seedAdmin.js
 *
 * Set ADMIN_EMAIL / ADMIN_PASSWORD env vars or edit the defaults below.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@crm.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';

(async () => {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: hash, role: 'ADMIN' },
    create: { name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash: hash, role: 'ADMIN' },
  });
  console.log(`✅ Admin user ready: ${user.email}  (role: ${user.role})`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
