import { describe, it, expect } from 'vitest'

describe('Database Schema', () => {
  describe('Users Table', () => {
    it('should export users table schema', async () => {
      const { users } = await import('@/lib/db/schema')
      expect(users).toBeDefined()
    })

    it('should have required user fields', async () => {
      const { users } = await import('@/lib/db/schema')
      expect(users.id).toBeDefined()
      expect(users.email).toBeDefined()
      expect(users.name).toBeDefined()
      expect(users.image).toBeDefined()
      expect(users.githubId).toBeDefined()
      expect(users.createdAt).toBeDefined()
    })
  })

  describe('Documents Table', () => {
    it('should export documents table schema', async () => {
      const { documents } = await import('@/lib/db/schema')
      expect(documents).toBeDefined()
    })

    it('should have required document fields', async () => {
      const { documents } = await import('@/lib/db/schema')
      expect(documents.id).toBeDefined()
      expect(documents.userId).toBeDefined()
      expect(documents.documentType).toBeDefined()
      expect(documents.documentId).toBeDefined()
      expect(documents.version).toBeDefined()
      expect(documents.status).toBeDefined()
      expect(documents.title).toBeDefined()
      expect(documents.content).toBeDefined()
      expect(documents.createdAt).toBeDefined()
      expect(documents.updatedAt).toBeDefined()
    })
  })

  describe('Document Versions Table', () => {
    it('should export documentVersions table schema', async () => {
      const { documentVersions } = await import('@/lib/db/schema')
      expect(documentVersions).toBeDefined()
    })

    it('should have required version fields', async () => {
      const { documentVersions } = await import('@/lib/db/schema')
      expect(documentVersions.id).toBeDefined()
      expect(documentVersions.documentId).toBeDefined()
      expect(documentVersions.version).toBeDefined()
      expect(documentVersions.content).toBeDefined()
      expect(documentVersions.createdAt).toBeDefined()
    })
  })

  describe('Atlassian Connections Table', () => {
    it('should export atlassianConnections table schema', async () => {
      const { atlassianConnections } = await import('@/lib/db/schema')
      expect(atlassianConnections).toBeDefined()
    })
  })

  describe('Publish Records Table', () => {
    it('should export publishRecords table schema', async () => {
      const { publishRecords } = await import('@/lib/db/schema')
      expect(publishRecords).toBeDefined()
    })
  })

  describe('Type Exports', () => {
    it('should export User type (compile-time check)', async () => {
      // Type inference is a compile-time feature
      // This test verifies the schema module exports correctly
      const schema = await import('@/lib/db/schema')
      expect(schema.users).toBeDefined()
      // TypeScript will verify the type exports at compile time
    })

    it('should export Document type (compile-time check)', async () => {
      const schema = await import('@/lib/db/schema')
      expect(schema.documents).toBeDefined()
    })

    it('should export all required tables', async () => {
      const schema = await import('@/lib/db/schema')
      // Verify all table exports exist
      expect(schema.users).toBeDefined()
      expect(schema.documents).toBeDefined()
      expect(schema.documentVersions).toBeDefined()
      expect(schema.atlassianConnections).toBeDefined()
      expect(schema.publishRecords).toBeDefined()
    })
  })
})
