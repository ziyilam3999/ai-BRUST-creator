'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useDocuments } from '@/hooks/use-documents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Badge } from '@/components/ui/badge'
import { FileText, Trash2, Edit, Plus, Loader2, ChevronDown } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type DocumentType = 'business_rule' | 'user_story' | undefined
type DocumentStatus = 'draft' | 'review' | 'approved' | 'deprecated' | undefined

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

export default function HistoryPage() {
  const [typeFilter, setTypeFilter] = useState<DocumentType>(undefined)
  const [statusFilter, setStatusFilter] = useState<DocumentStatus>(undefined)

  const { documents, isLoading, error, deleteDocument, refetch } = useDocuments({
    type: typeFilter,
    status: statusFilter,
  })

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id)
    } catch (err) {
      console.error('Failed to delete document:', err)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Document History</h2>
          <p className="text-muted-foreground">
            View and manage all your Business Rules and User Stories
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Document
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/business-rule/new">Business Rule</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/user-story/new">User Story</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>
                {documents.length} document{documents.length !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
            <div className="flex gap-4">
              <Select
                value={typeFilter || 'all'}
                onValueChange={(v) => setTypeFilter(v === 'all' ? undefined : v as DocumentType)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="business_rule">Business Rules</SelectItem>
                  <SelectItem value="user_story">User Stories</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter || 'all'}
                onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v as DocumentStatus)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No documents found</p>
              <Link href="/business-rule/new">
                <Button>Create Your First Document</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-mono text-sm">{doc.documentId}</TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{TYPE_LABELS[doc.documentType]}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[doc.status]} variant="secondary">
                        {doc.status}
                      </Badge>
                    </TableCell>
                    <TableCell>v{doc.version}</TableCell>
                    <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/${doc.documentType === 'user_story' ? 'user-story' : 'business-rule'}/${doc.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Document</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete &quot;{doc.title}&quot;? This action cannot be
                                undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(doc.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
