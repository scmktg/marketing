import { login } from "./actions";
import { Button } from "@/components/ui/button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-semibold text-beachie-deep">
          The Beachie Midweek Engine
        </h1>
        <p className="mb-6 text-sm text-beachie-deep/70">Sign in to continue</p>

        <form action={login} className="space-y-4">
          <input type="hidden" name="redirect_to" value={params.redirect_to ?? ""} />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-beachie-deep">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 block w-full rounded-md border border-beachie-sand px-3 py-2 text-beachie-deep shadow-sm focus:border-beachie-lake focus:outline-none focus:ring-1 focus:ring-beachie-lake"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-beachie-deep">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 block w-full rounded-md border border-beachie-sand px-3 py-2 text-beachie-deep shadow-sm focus:border-beachie-lake focus:outline-none focus:ring-1 focus:ring-beachie-lake"
            />
          </div>
          {params.error ? (
            <p className="text-sm text-beachie-coral" data-testid="login-error">
              {params.error}
            </p>
          ) : null}
          <Button type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </div>
    </main>
  );
}
