// Prisma configuration for different environments
const { PrismaClient } = require('@prisma/client/edge');
const { withAccelerate } = require('@prisma/extension-accelerate');

// Check if we're using Accelerate (production) or local database (development)
const isUsingAccelerate = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('prisma://');

let prisma;

if (isUsingAccelerate) {
  // Production: Use Prisma Accelerate
  console.log('🚀 Using Prisma Accelerate for production');
  prisma = new PrismaClient().$extends(withAccelerate());
} else {
  // Development: Use regular Prisma Client
  console.log('🔧 Using regular Prisma Client for development');
  const { PrismaClient: RegularPrismaClient } = require('@prisma/client');
  prisma = new RegularPrismaClient();
}

module.exports = prisma;
