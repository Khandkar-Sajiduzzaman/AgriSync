const { PrismaClient } = require('@prisma/client');

// This is a singleton pattern.
// In development, hot-reloading can cause this file to run many times.
// We store the client in globalThis so Node.js reuses it.
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;