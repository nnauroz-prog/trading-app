import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-4">
      {error === 'not_allowed' && (
        <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/60 p-4 text-sm text-rose-200">
          Diese E-Mail-Adresse ist nicht freigeschaltet. Wende dich an den Admin.
        </div>
      )}
      <LoginForm />
    </main>
  );
}
