"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

// User type definition
export interface User {
  id: string
  name: string
  email: string
  image?: string
  createdAt: string
}

// Mock database of users
let users: User[] = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@example.com",
    image: "/placeholder.svg?height=32&width=32",
    createdAt: new Date().toISOString(),
  },
]

// Validation schemas
const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

const signUpSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
})

const updateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
})

// Authentication actions
export async function signIn(prevState: any, formData: FormData) {
  // Validate form data
  const validatedFields = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  // Return errors if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid credentials. Please try again.",
    }
  }

  const { email, password } = validatedFields.data

  // In a real app, you would verify credentials against a database
  // For demo purposes, we'll accept any credentials that match our demo user
  // or any valid email with password "password123"
  const user = users.find((u) => u.email === email)

  if (!user) {
    // For demo purposes, create a new user if email doesn't exist
    if (password === "password123") {
      const newUser: User = {
        id: Math.random().toString(36).substring(2, 9),
        name: email.split("@")[0],
        email,
        createdAt: new Date().toISOString(),
      }
      users.push(newUser)

      // Set auth cookie
      cookies().set("auth", JSON.stringify({ userId: newUser.id }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
      })

      redirect("/dashboard")
    }

    return {
      errors: {
        email: ["Invalid email or password"],
        password: ["Invalid email or password"],
      },
      message: "Invalid credentials. Please try again.",
    }
  }

  // Set auth cookie
  cookies().set("auth", JSON.stringify({ userId: user.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })

  redirect("/dashboard")
}

export async function signUp(prevState: any, formData: FormData) {
  // Validate form data
  const validatedFields = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  // Return errors if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please correct the errors above.",
    }
  }

  const { name, email, password } = validatedFields.data

  // Check if user already exists
  if (users.some((u) => u.email === email)) {
    return {
      errors: {
        email: ["User with this email already exists"],
      },
      message: "User with this email already exists.",
    }
  }

  // Create new user
  const newUser: User = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    email,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)

  // Set auth cookie
  cookies().set("auth", JSON.stringify({ userId: newUser.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })

  redirect("/dashboard")
}

export async function signOut() {
  // Delete auth cookie
  cookies().delete("auth")
  redirect("/signin")
}

export async function updateProfile(prevState: any, formData: FormData) {
  // Get current user
  const user = await getCurrentUser()

  if (!user) {
    return {
      errors: {},
      message: "You must be signed in to update your profile.",
    }
  }

  // Validate form data
  const validatedFields = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  })

  // Return errors if validation fails
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please correct the errors above.",
    }
  }

  const { name, email } = validatedFields.data

  // Check if email is already taken by another user
  if (email !== user.email && users.some((u) => u.email === email)) {
    return {
      errors: {
        email: ["User with this email already exists"],
      },
      message: "User with this email already exists.",
    }
  }

  // Update user
  users = users.map((u) => {
    if (u.id === user.id) {
      return {
        ...u,
        name,
        email,
      }
    }
    return u
  })

  return {
    errors: {},
    message: "Profile updated successfully.",
    success: true,
  }
}

// Helper functions
export async function getCurrentUser(): Promise<User | undefined> {
  const authCookie = cookies().get("auth")

  if (!authCookie) {
    return undefined
  }

  try {
    const { userId } = JSON.parse(authCookie.value)
    return users.find((u) => u.id === userId)
  } catch (error) {
    return undefined
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/signin")
  }

  return user
}
