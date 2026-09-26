import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'

const schema = z.object({ email: z.email('Введите корректный email') })

export function LoginPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSentTo(email)
  })

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="size-6" /> grindset
          </div>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Пришлём ссылку для входа на почту — без пароля.</CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <MailCheck className="size-8 text-primary" strokeWidth={1.5} />
              <p className="text-sm">
                Ссылка отправлена на <span className="font-medium">{sentTo}</span>. Откройте письмо на этом
                устройстве.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setSentTo(null)}>
                Другой email
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" autoFocus {...register('email')} />
                {formState.errors.email && (
                  <p className="text-sm text-destructive">{formState.errors.email.message}</p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting ? 'Отправляем…' : 'Получить ссылку'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
