'use client'

import Link from 'next/link'
import { useDocuments } from '@/hooks/use-documents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Clock, ArrowRight, Loader2 } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  deprecated: 'bg-gray-100 text-gray-800',
}

const TYPE_LABELS: Record<string, string> = {
  business_rule: 'Business Rule',
  user_story: 'User Story',
}

export default function DashboardPage() {
  const { documents, isLoading, error } = useDocuments()

  // Show only the 5 most recent documents
  const recentDocuments = documents.slice(0, 5)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">
          Create and manage your Business Rules and User Stories
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Business Rules</CardTitle>
            <CardDescription>
              Create structured business rules with IF/THEN/ELSE statements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/business-rule/new">
              <Button>Create Business Rule</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Stories</CardTitle>
            <CardDescription>
              Create user stories with acceptance criteria in Gherkin format
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>Create User Story (Coming Soon)</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>
              Your recently created and edited documents
            </CardDescription>
          </div>
          {documents.length > 0 && (
            <Link href="/history">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : recentDocuments.length === 0 ? (
            <div className="text-center py-6">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No documents yet. Create your first Business Rule to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/business-rule/${doc.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.documentId} · {TYPE_LABELS[doc.documentType]}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[doc.status]} variant="secondary">
                      {doc.status}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(doc.updatedAt)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
