require('dotenv').config();
const { prisma } = require('./db');
const { hashPassword } = require('./utils/password');

async function seed() {
  const adminPassword = await hashPassword('password');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sgau.dz' },
    update: {},
    create: {
      email: 'admin@sgau.dz',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'SGAU',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Seeded admin', admin.email);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
