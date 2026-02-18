/**
 * B6 (partial): publish-queue.ts unit tests — TDD RED phase
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import {
  queuePublish,
  processPublishQueue,
  getQueue,
  clearQueue,
  PUBLISH_QUEUE_CONFIG,
  type QueuedPublish,
} from '@/lib/guided/publish-queue'

describe('publish-queue', () => {
  beforeEach(() => {
    clearQueue()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // --- CONFIG ---

  it('exports PUBLISH_QUEUE_CONFIG with expected defaults', () => {
    expect(PUBLISH_QUEUE_CONFIG.maxAttempts).toBe(3)
    expect(PUBLISH_QUEUE_CONFIG.baseBackoffMs).toBe(1_000)
  })

  // --- queuePublish ---

  it('queuePublish adds an entry to the queue', () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    expect(getQueue()).toHaveLength(1)
  })

  it('queuePublish assigns a unique id', () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    queuePublish({ documentId: 'doc-2', destination: 'confluence', payload: {} })
    const ids = getQueue().map((e) => e.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('queuePublish sets initial attempts to 0 and status to pending', () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const entry = getQueue()[0]
    expect(entry.attempts).toBe(0)
    expect(entry.status).toBe('pending')
  })

  // --- processPublishQueue ---

  it('processPublishQueue calls the publish function for each pending entry', async () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const publishFn = vi.fn().mockResolvedValue({ success: true })
    await processPublishQueue(publishFn)
    expect(publishFn).toHaveBeenCalledTimes(1)
  })

  it('processPublishQueue removes entry from queue on success', async () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const publishFn = vi.fn().mockResolvedValue({ success: true })
    await processPublishQueue(publishFn)
    expect(getQueue()).toHaveLength(0)
  })

  it('processPublishQueue increments attempts on failure', async () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const publishFn = vi.fn().mockRejectedValue(new Error('network'))
    await processPublishQueue(publishFn)
    const entry = getQueue()[0]
    expect(entry.attempts).toBe(1)
    expect(entry.status).toBe('pending')
  })

  it('processPublishQueue marks entry as failed after maxAttempts', async () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const publishFn = vi.fn().mockRejectedValue(new Error('network'))

    // Exhaust all attempts
    for (let i = 0; i < PUBLISH_QUEUE_CONFIG.maxAttempts; i++) {
      await processPublishQueue(publishFn)
    }

    const entry = getQueue()[0]
    expect(entry.status).toBe('failed')
    expect(entry.attempts).toBe(PUBLISH_QUEUE_CONFIG.maxAttempts)
  })

  it('processPublishQueue skips entries with failed status', async () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    const publishFn = vi.fn().mockRejectedValue(new Error('network'))

    // Exhaust and mark failed
    for (let i = 0; i < PUBLISH_QUEUE_CONFIG.maxAttempts; i++) {
      await processPublishQueue(publishFn)
    }

    publishFn.mockClear()
    await processPublishQueue(publishFn)

    // Failed entry should not be retried
    expect(publishFn).not.toHaveBeenCalled()
  })

  // --- clearQueue ---

  it('clearQueue empties the queue', () => {
    queuePublish({ documentId: 'doc-1', destination: 'confluence', payload: {} })
    queuePublish({ documentId: 'doc-2', destination: 'jira', payload: {} })
    clearQueue()
    expect(getQueue()).toHaveLength(0)
  })
})
