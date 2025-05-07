"use client"

import { useState } from "react"
import { useFormState } from "react-dom"
import { updateProfile, type User } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ReloadIcon } from "@radix-ui/react-icons"

interface ProfileFormProps {
  user: User
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, setIsPending] = useState(false)
  const [state, formAction] = useFormState(updateProfile, {
    errors: {},
    message: "",
    success: false,
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
          <Alert variant={state.success ? "default" : "destructive"}>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="John Doe" required defaultValue={user.name} />
          {state.errors?.name && <p className="text-sm text-red-500">{state.errors.name[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            defaultValue={user.email}
          />
          {state.errors?.email && <p className="text-sm text-red-500">{state.errors.email[0]}</p>}
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          Update Profile
        </Button>
      </form>
    </div>
  )
}
