'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

interface AtlassianStatus {
  connected: boolean
  siteName?: string
  siteUrl?: string
  needsRefresh?: boolean
  connectedAt?: string
}

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const [atlassianStatus, setAtlassianStatus] = useState<AtlassianStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  // Handle OAuth callback status
  useEffect(() => {
    const atlassianResult = searchParams.get('atlassian')
    const message = searchParams.get('message')

    if (atlassianResult === 'connected') {
      toast.success('Atlassian connected successfully!')
    } else if (atlassianResult === 'error') {
      toast.error(`Atlassian connection failed: ${message || 'Unknown error'}`)
    }
  }, [searchParams])

  // Fetch Atlassian connection status
  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/atlassian/status')
        if (response.ok) {
          const data = await response.json()
          setAtlassianStatus(data)
        }
      } catch (error) {
        console.error('Failed to fetch Atlassian status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [searchParams])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      const response = await fetch('/api/atlassian/connect')
      if (response.ok) {
        const data = await response.json()
        window.location.href = data.authUrl
      } else {
        toast.error('Failed to start Atlassian connection')
        setConnecting(false)
      }
    } catch (error) {
      console.error('Connect error:', error)
      toast.error('Failed to connect to Atlassian')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/atlassian/status', {
        method: 'DELETE',
      })
      if (response.ok) {
        setAtlassianStatus({ connected: false })
        toast.success('Atlassian disconnected successfully')
      } else {
        toast.error('Failed to disconnect Atlassian')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect Atlassian')
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Atlassian Integration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg
                className="w-6 h-6"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.375 14.75C9.13333 14.4667 8.79167 14.475 8.35 14.775C7.90833 15.075 7.75 15.4333 7.875 15.85L11.625 27.35C11.7917 27.8167 12.1583 28.05 12.725 28.05H19.275C19.8417 28.05 20.2083 27.8167 20.375 27.35L27.125 8.65C27.2917 8.23333 27.1583 7.875 26.725 7.575C26.2917 7.275 25.9333 7.26667 25.65 7.55L17.55 15.65C17.2667 15.9333 16.9 16.075 16.45 16.075C16 16.075 15.6333 15.9333 15.35 15.65L9.375 14.75Z"
                  fill="#2684FF"
                />
              </svg>
              Atlassian Integration
            </CardTitle>
            <CardDescription>
              Connect your Atlassian account to publish Business Rules to Confluence
              and User Stories to JIRA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                Loading...
              </div>
            ) : atlassianStatus?.connected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    Connected
                  </Badge>
                  {atlassianStatus.needsRefresh && (
                    <Badge variant="destructive">Token Expired</Badge>
                  )}
                </div>

                <div className="rounded-lg border p-4 bg-muted/50">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Site Name</span>
                      <span className="text-sm font-medium">{atlassianStatus.siteName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Site URL</span>
                      <a
                        href={atlassianStatus.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {atlassianStatus.siteUrl}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {atlassianStatus.needsRefresh && (
                    <Button onClick={handleConnect} variant="default">
                      Reconnect
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Disconnect</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Atlassian?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove your Atlassian connection. You won&apos;t be able
                          to publish to Confluence or JIRA until you reconnect.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnect}>
                          Disconnect
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Connect your Atlassian account to enable publishing features.
                </p>
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    'Connect Atlassian'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your account information from GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You are signed in with GitHub. To manage your account, visit your
              GitHub settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
