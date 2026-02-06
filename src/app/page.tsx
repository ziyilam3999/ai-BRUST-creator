import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    // If logged in, go to dashboard
    redirect('/history')
  } else {
    // If not logged in, go to login
    redirect('/login')
  }
}
