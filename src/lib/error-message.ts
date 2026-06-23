export function publicRuntimeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('Environment variable not found') || message.includes('prisma://')) {
    return 'Production database is not configured. Set POSTGRES_URL in Vercel project environment variables.';
  }

  if (message.toLowerCase().includes('connect') || message.toLowerCase().includes('database')) {
    return 'Production database is unavailable. Check the Vercel database connection and Prisma schema.';
  }

  return 'Runtime data could not be loaded. Check production logs for details.';
}
