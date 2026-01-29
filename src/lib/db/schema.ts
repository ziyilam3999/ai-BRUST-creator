import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// Users table - stores GitHub OAuth user data
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email'),
  name: text('name'),
  image: text('image'),
  githubId: text('github_id').unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Documents table - stores Business Rules and User Stories
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  documentType: text('document_type', { enum: ['business_rule', 'user_story'] }).notNull(),
  documentId: text('document_id').notNull(), // BR-VAL-001, US-AUTH-001
  version: integer('version').notNull().default(1),
  status: text('status', { enum: ['draft', 'review', 'approved', 'deprecated'] })
    .notNull()
    .default('draft'),
  title: text('title').notNull(),
  content: text('content', { mode: 'json' }), // JSON content
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
  publishedAt: text('published_at'),
  deletedAt: text('deleted_at'), // Soft delete
})

// Document versions table - tracks version history
export const documentVersions = sqliteTable('document_versions', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id),
  version: integer('version').notNull(),
  content: text('content', { mode: 'json' }),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

// Atlassian connections table - stores OAuth tokens per user
export const atlassianConnections = sqliteTable('atlassian_connections', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id)
    .unique(),
  cloudId: text('cloud_id').notNull(),
  accessToken: text('access_token').notNull(), // Encrypted in production
  refreshToken: text('refresh_token').notNull(), // Encrypted in production
  tokenExpiresAt: text('token_expires_at'),
  scopes: text('scopes'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

// Publish records table - audit trail for publishing
export const publishRecords = sqliteTable('publish_records', {
  id: text('id').primaryKey(),
  documentId: text('document_id')
    .notNull()
    .references(() => documents.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  target: text('target', { enum: ['confluence', 'jira'] }).notNull(),
  targetUrl: text('target_url'),
  targetId: text('target_id'), // Confluence page ID or JIRA issue key
  status: text('status', { enum: ['pending', 'success', 'failed'] })
    .notNull()
    .default('pending'),
  errorMessage: text('error_message'),
  publishedAt: text('published_at').default(sql`CURRENT_TIMESTAMP`),
})

// Type exports for TypeScript
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

export type DocumentVersion = typeof documentVersions.$inferSelect
export type NewDocumentVersion = typeof documentVersions.$inferInsert

export type AtlassianConnection = typeof atlassianConnections.$inferSelect
export type NewAtlassianConnection = typeof atlassianConnections.$inferInsert

export type PublishRecord = typeof publishRecords.$inferSelect
export type NewPublishRecord = typeof publishRecords.$inferInsert
