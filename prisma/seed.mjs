import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.product.upsert({
    where: { code: 'rustzen-clear' },
    update: {},
    create: {
      code: 'rustzen-clear',
      name: 'Rustzen Clear',
      description: 'A lightweight macOS cleaner for developer environments.',
    },
  });

  await prisma.product.upsert({
    where: { code: 'rustzen-clipboard' },
    update: {},
    create: {
      code: 'rustzen-clipboard',
      name: 'Rustzen Clipboard',
      description: 'A local-first clipboard history app for macOS.',
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
