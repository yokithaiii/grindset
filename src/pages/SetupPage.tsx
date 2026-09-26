export function SetupPage() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Подключите Supabase</h1>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
        <li>Создайте проект на supabase.com.</li>
        <li>
          Примените миграцию <code className="text-foreground">supabase/migrations/*_init.sql</code> (SQL Editor или{' '}
          <code className="text-foreground">npx supabase db push</code>).
        </li>
        <li>
          Скопируйте <code className="text-foreground">.env.example</code> в{' '}
          <code className="text-foreground">.env.local</code> и заполните URL и anon key.
        </li>
        <li>Перезапустите dev-сервер.</li>
      </ol>
    </div>
  )
}
