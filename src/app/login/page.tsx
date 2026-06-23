import { redirect } from 'next/navigation';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <main className="grid min-h-screen bg-background text-foreground lg:grid-cols-[0.9fr_1.1fr]">
      <section className="hidden min-h-screen flex-col justify-between bg-sidebar p-8 text-sidebar-foreground lg:flex xl:p-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
            R
          </span>
          <div>
            <p className="text-sm font-semibold">RustZen Cloud</p>
            <p className="text-xs text-sidebar-foreground/58">Admin control plane</p>
          </div>
        </div>

        <div className="max-w-lg">
          <Badge className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground" variant="outline">
            Production admin
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-normal">
            Licensing, devices, and releases in one operations surface.
          </h1>
          <p className="mt-5 text-sm leading-6 text-sidebar-foreground/64">
            Sign in to manage RustZen desktop product metadata while client private data remains local.
          </p>
        </div>

        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-4">
            <KeyRound className="h-4 w-4" />
            License activation and revocation
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/45 p-4">
            <ShieldCheck className="h-4 w-4" />
            Admin session protected dashboard
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
              R
            </span>
            <div>
              <p className="text-sm font-semibold">RustZen Cloud</p>
              <p className="text-xs text-muted-foreground">Admin control plane</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Badge className="w-fit" variant="secondary">Secure access</Badge>
              <CardTitle className="mt-3 text-2xl">Admin sign in</CardTitle>
              <CardDescription>
                Use the configured admin credentials for this deployment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {params.error ? (
                <Alert className="mb-5 border-destructive/30 bg-red-50 text-red-900">
                  <AlertTitle>Sign in failed</AlertTitle>
                  <AlertDescription className="text-red-800">Invalid username or password.</AlertDescription>
                </Alert>
              ) : null}

              <form action={login} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" name="username" type="text" autoComplete="username" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" autoComplete="current-password" required />
                </div>

                <Button className="w-full" size="lg" type="submit">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
