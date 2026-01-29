'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface PublishDialogProps {
  documentId: string
  documentTitle: string
  platform: 'confluence' | 'jira'
  onPublished?: (result: { pageUrl: string; updated: boolean }) => void
  children?: React.ReactNode
}

export function PublishDialog({
  documentId,
  documentTitle,
  platform,
  onPublished,
  children,
}: PublishDialogProps) {
  const [publishing, setPublishing] = useState(false)
  const [open, setOpen] = useState(false)

  const platformName = platform === 'confluence' ? 'Confluence' : 'JIRA'
  const actionVerb = platform === 'confluence' ? 'Publish' : 'Create Issue'

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const response = await fetch(`/api/publish/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish')
      }

      setOpen(false)
      // Handle both Confluence (pageUrl) and JIRA (issueUrl) response formats
      const url = data.pageUrl || data.issueUrl
      toast.success(
        data.updated
          ? `Updated in ${platformName}!`
          : `Published to ${platformName}!`,
        {
          description: 'Click to view',
          action: {
            label: 'Open',
            onClick: () => window.open(url, '_blank'),
          },
        }
      )

      onPublished?.({
        pageUrl: url,
        updated: data.updated,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(`Failed to publish: ${message}`)
    } finally {
      setPublishing(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {children || (
          <Button variant="outline">
            {actionVerb} to {platformName}
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionVerb} to {platformName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will {platform === 'confluence' ? 'create or update a page' : 'create an issue'} in {platformName} with the content of &quot;{documentTitle}&quot;.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={publishing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handlePublish()
            }}
            disabled={publishing}
          >
            {publishing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Publishing...
              </>
            ) : (
              actionVerb
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
