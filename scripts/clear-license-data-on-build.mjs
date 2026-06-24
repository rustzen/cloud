import { PrismaClient } from '@prisma/client';

if (process.env.VERCEL_ENV !== 'production') {
  console.log('Skipping license data cleanup outside production deployment.');
  process.exit(0);
}

const prisma = new PrismaClient();

try {
  const before = await Promise.all([
    prisma.license.count(),
    prisma.licenseDevice.count(),
  ]);

  await prisma.licenseDevice.deleteMany();
  await prisma.license.deleteMany();

  const after = await Promise.all([
    prisma.license.count(),
    prisma.licenseDevice.count(),
  ]);

  console.log(JSON.stringify({
    action: 'clear-license-data-on-build',
    before: { licenses: before[0], devices: before[1] },
    after: { licenses: after[0], devices: after[1] },
  }));
} finally {
  await prisma.$disconnect();
}
