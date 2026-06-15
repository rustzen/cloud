import { redirect } from 'next/navigation';
import { createAdminSession, hasAdminSession, verifyAdminPassword } from '@/lib/auth';

async function login(formData: FormData) {
  'use server';

  const password = String(formData.get('password') ?? '');

  if (!verifyAdminPassword(password)) {
    redirect('/login?error=invalid');
  }

  await createAdminSession();
  redirect('/dashboard');
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasAdminSession()) {
    redirect('/dashboard');
  }

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form action={login} className="rz-cloud-panel w-full max-w-sm p-8">
        <div className="rz-cloud-logo">
          <span className="rz-cloud-mark">R</span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--rz-clipboard)]">
              RustZen Cloud
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--rz-ink)]">Admin sign in</h1>
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-[var(--rz-muted)]">
          Enter the admin password to manage client licenses, device limits, and release metadata.
        </p>
        {params.error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">Invalid password.</p> : null}
        <label className="mt-6 block text-sm font-medium text-[var(--rz-ink)]" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="mt-2 w-full rounded-lg border border-[var(--rz-border)] px-4 py-3 outline-none focus:border-[var(--rz-clipboard)]"
          required
        />
        <button className="mt-6 w-full rounded-lg bg-[var(--rz-ink)] px-4 py-3 text-sm font-semibold text-white" type="submit">
          Sign in
        </button>
      </form>
    </main>
  );
}
