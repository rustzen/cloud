import { redirect } from 'next/navigation';
import { assertAdminRequestAllowed } from '@/lib/admin-security';
import { createAdminSession, hasAdminSession, verifyAdminCredentials } from '@/lib/auth';

async function login(formData: FormData) {
  'use server';

  await assertAdminRequestAllowed();

  const username = String(formData.get('username') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!verifyAdminCredentials(username, password)) {
    redirect('/login?error=invalid');
  }

  await createAdminSession(username);
  redirect('/dashboard');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await assertAdminRequestAllowed();

  if (await hasAdminSession()) {
    redirect('/dashboard');
  }

  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[var(--rz-page)] px-5 py-6 text-[var(--rz-ink)] sm:px-8 lg:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-48px)] max-w-6xl overflow-hidden rounded-lg border border-[var(--rz-border)] bg-white shadow-[0_24px_80px_rgba(32,36,43,0.10)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex min-h-[280px] flex-col justify-between bg-[#111820] p-8 text-white sm:p-10 lg:p-12">
          <div className="rz-cloud-logo">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-white text-sm font-bold text-[#111820]">
              R
            </span>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8fd8d2]">RustZen Cloud</p>
              <p className="mt-1 text-sm text-white/62">Admin control plane</p>
            </div>
          </div>

          <div>
            <h1 className="max-w-sm text-4xl font-semibold leading-[1.05] tracking-normal sm:text-5xl">
              License and release operations.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/68">
              Manage products, licenses, device limits, and release metadata for RustZen desktop clients.
            </p>
          </div>

          <dl className="grid gap-4 border-t border-white/10 pt-6 text-sm sm:grid-cols-3 lg:grid-cols-1">
            <div>
              <dt className="font-medium text-white">Licenses</dt>
              <dd className="mt-1 text-white/58">Activation, revocation, and device binding.</dd>
            </div>
            <div>
              <dt className="font-medium text-white">Versions</dt>
              <dd className="mt-1 text-white/58">Release metadata for update checks.</dd>
            </div>
            <div>
              <dt className="font-medium text-white">API</dt>
              <dd className="mt-1 text-white/58">Token-protected operational endpoints.</dd>
            </div>
          </dl>
        </section>

        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
          <form action={login} className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--rz-clipboard)]">
                Secure access
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-normal text-[var(--rz-ink)]">
                Sign in
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--rz-muted)]">
                Use the configured admin credentials for this deployment.
              </p>
            </div>

            {params.error ? (
              <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                Invalid username or password.
              </p>
            ) : null}

            <label className="block text-sm font-medium text-[var(--rz-ink)]" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="mt-2 h-12 w-full rounded-md border border-[var(--rz-border)] bg-white px-4 text-base text-[var(--rz-ink)] outline-none transition focus:border-[var(--rz-clipboard)] focus:ring-4 focus:ring-[#087f78]/12"
              required
            />

            <label className="mt-5 block text-sm font-medium text-[var(--rz-ink)]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 h-12 w-full rounded-md border border-[var(--rz-border)] bg-white px-4 text-base text-[var(--rz-ink)] outline-none transition focus:border-[var(--rz-clipboard)] focus:ring-4 focus:ring-[#087f78]/12"
              required
            />

            <button
              className="mt-7 h-12 w-full rounded-md bg-[var(--rz-ink)] px-4 text-sm font-semibold text-white transition hover:bg-[#111820] focus:outline-none focus:ring-4 focus:ring-[#20242b]/16"
              type="submit"
            >
              Sign in
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
