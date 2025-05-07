import { signOut } from "@/lib/auth"

export async function POST() {
  return await signOut()
}
