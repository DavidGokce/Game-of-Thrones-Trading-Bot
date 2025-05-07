"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"
import { getEnv } from "@/lib/env"
import * as bcrypt from "bcryptjs"
import * as jwt from "jsonwebtoken"

// User type definition
export interface User {
  id: string
  name: string
  email: string
  image?: string
  createdAt: string
  hashedPassword?: string
}

// Internal user type with required password
interface InternalUser extends User {
  hashedPassword: string
}

// Mock database of users - in production, use a real database
let users: InternalUser[] = [
  {
    id: "1",
    name: "Demo User",
    email: "demo@example.com",
    image: "/placeholder.svg?height=32&width=32",
    createdAt: new Date().toISOString(),
    hashedPassword: bcrypt.hashSync("password123", 10) // Pre-hashed for demo
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
  password: z.string().min(8, { message: "Password must be at least 8 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
      message: "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character"
    }),
})

const updateProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
})

// JWT helper functions
const JWT_SECRET = getEnv('JWT_SECRET', 'your-secret-key')
const COOKIE_SECRET = getEnv('COOKIE_SECRET', 'your-cookie-secret')

function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}

// Authentication actions
export async function signIn(prevState: any, formData: FormData) {
  const validatedFields = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid credentials. Please try again.",
    }
  }

  const { email, password } = validatedFields.data
  const user = users.find((u) => u.email === email)

  if (!user || !bcrypt.compareSync(password, user.hashedPassword)) {
    return {
      errors: {
        email: ["Invalid email or password"],
        password: ["Invalid email or password"],
      },
      message: "Invalid credentials. Please try again.",
    }
  }

  // Generate JWT token
  const token = generateToken(user.id)

  // Set secure cookie with JWT
  const cookieStore = await cookies()
  cookieStore.set({
    name: "auth-token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })

  redirect("/dashboard")
}

export async function signUp(prevState: any, formData: FormData) {
  const validatedFields = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please correct the errors above.",
    }
  }

  const { name, email, password } = validatedFields.data

  if (users.some((u) => u.email === email)) {
    return {
      errors: {
        email: ["User with this email already exists"],
      },
      message: "User with this email already exists.",
    }
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10)

  // Create new user
  const newUser: InternalUser = {
    id: Math.random().toString(36).substring(2, 9),
    name,
    email,
    hashedPassword,
    createdAt: new Date().toISOString(),
  }

  users.push(newUser)

  // Generate JWT token
  const token = generateToken(newUser.id)

  // Set secure cookie with JWT
  const cookieStore = await cookies()
  cookieStore.set({
    name: "auth-token",
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })

  redirect("/dashboard")
}

export async function signOut() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
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
  const cookieStore = await cookies()
  const authCookie = cookieStore.get("auth-token")

  if (!authCookie) {
    return undefined
  }

  try {
    const decoded = verifyToken(authCookie.value)
    if (!decoded) {
      return undefined
    }

    const user = users.find((u) => u.id === decoded.userId)
    if (!user) {
      return undefined
    }

    // Don't expose the hashed password
    const { hashedPassword, ...safeUser } = user
    return safeUser
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
