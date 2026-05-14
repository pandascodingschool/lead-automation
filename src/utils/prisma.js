// Singleton Prisma client — reuse one instance across the app
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
