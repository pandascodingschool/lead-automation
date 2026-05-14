// Seed script — creates initial users for lead assignment
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: 'Amit Sharma', email: 'amit@company.com' },
    { name: 'Priya Verma', email: 'priya@company.com' },
    { name: 'Rahul Singh', email: 'rahul@company.com' },
    { name: 'Neha Gupta', email: 'neha@company.com' },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: user,
    });
  }

  console.log('✅ Seeded users successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
