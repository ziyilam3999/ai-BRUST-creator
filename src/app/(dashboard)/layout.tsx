import Link from 'next/link'
import { SessionProvider } from '@/components/providers/session-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">BRUST Creator</h1>
            <nav className="flex gap-4">
              <Link href="/business-rule/new" className="text-sm hover:underline">
                New Business Rule
              </Link>
            </nav>
          </div>
        </header>
        {children}
      </div>
    </SessionProvider>
  )
}
