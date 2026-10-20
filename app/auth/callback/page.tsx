export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">(no UI)</h1>
        <p className="text-sm text-muted-foreground">
          Supabase auth redirect; merges guest data, then goes to /
        </p>
      </div>
    </main>
  );
}
