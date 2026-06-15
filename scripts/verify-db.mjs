import { existsSync, readFileSync } from 'node:fs';

const envFiles = ['.env.local', '.env'];

function parseEnvLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  const index = trimmed.indexOf('=');
  if (index === -1) return null;

  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

for (const file of envFiles) {
  if (!existsSync(file)) continue;

  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const entry = parseEnvLine(line);
    if (!entry) continue;

    const [key, value] = entry;
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const required = ['POSTGRES_PRISMA_URL', 'POSTGRES_URL_NON_POOLING'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`Missing required database env: ${missing.join(', ')}`);
  console.error('Run `pnpm dlx vercel env pull .env.local --yes --environment=development` or create .env.local.');
  process.exit(1);
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

try {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  const [products, licenses, devices, versions, billingEvents] = await Promise.all([
    prisma.product.count(),
    prisma.license.count(),
    prisma.licenseDevice.count(),
    prisma.appVersion.count(),
    prisma.billingEvent.count(),
  ]);

  console.log('Database connection verified.');
  console.log(
    JSON.stringify(
      {
        products,
        licenses,
        devices,
        versions,
        billingEvents,
      },
      null,
      2,
    ),
  );
} finally {
  await prisma.$disconnect();
}
