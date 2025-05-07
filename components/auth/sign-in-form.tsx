"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import { signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReloadIcon } from "@radix-ui/react-icons"

export function SignInForm() {
  const [isPending, setIsPending] = useState(false)
  const [state, formAction] = useFormState(signIn, {
    errors: {},
    message: "",
  })

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true)
    await formAction(formData)
    setIsPending(false)
  }

  return (
    <div className="space-y-4">
      <form action={handleSubmit} className="space-y-4">
        {state.message && (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            autoComplete="email"
            defaultValue="demo@example.com"
          />
          {state.errors?.email && <p className="text-sm text-red-500">{state.errors.email[0]}</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <a href="#" className="text-sm font-medium text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
            autoComplete="current-password"
            defaultValue="password123"
          />
          {state.errors?.password && <p className="text-sm text-red-500">{state.errors.password[0]}</p>}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Button variant="outline" disabled>
          Google
        </Button>
        <Button variant="outline" disabled>
          GitHub
        </Button>
      </div>
    </div>
  )
}
