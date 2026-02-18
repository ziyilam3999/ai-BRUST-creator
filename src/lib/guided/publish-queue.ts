/**
 * publish-queue.ts
 * In-memory queue for failed publish attempts with exponential-backoff retry.
 * Plan §B3: queuePublish() / processPublishQueue() / 3-attempt retry.
 */

export type PublishDestination = 'confluence' | 'jira'

export interface QueuedPublish {
  id: string
  documentId: string
  destination: PublishDestination
  payload: Record<string, unknown>
  attempts: number
  status: 'pending' | 'failed'
  lastAttemptAt: number | null
}

export type PublishFn = (entry: QueuedPublish) => Promise<{ success: boolean }>

export const PUBLISH_QUEUE_CONFIG = {
  /** Maximum retry attempts before marking an entry as failed */
  maxAttempts: 3,
  /** Base delay for exponential backoff in ms */
  baseBackoffMs: 1_000,
} as const

// ── In-memory queue (module-scoped singleton) ─────────────────────────────

const _queue: QueuedPublish[] = []

const _generateId = () => `pq-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Add a publish request to the queue.
 */
export function queuePublish(params: {
  documentId: string
  destination: PublishDestination
  payload: Record<string, unknown>
}): QueuedPublish {
  const entry: QueuedPublish = {
    id: _generateId(),
    ...params,
    attempts: 0,
    status: 'pending',
    lastAttemptAt: null,
  }
  _queue.push(entry)
  return entry
}

/**
 * Process all pending entries in the queue using the provided publish function.
 * Failed entries gain an attempt counter; after maxAttempts they are marked 'failed'.
 */
export async function processPublishQueue(publishFn: PublishFn): Promise<void> {
  for (const entry of _queue) {
    if (entry.status !== 'pending') continue

    entry.lastAttemptAt = Date.now()

    try {
      await publishFn(entry)
      // On success: remove from queue
      const idx = _queue.indexOf(entry)
      if (idx !== -1) _queue.splice(idx, 1)
    } catch {
      entry.attempts += 1
      if (entry.attempts >= PUBLISH_QUEUE_CONFIG.maxAttempts) {
        entry.status = 'failed'
      }
    }
  }
}

/**
 * Return the current queue contents (shallow copy for read access).
 */
export function getQueue(): QueuedPublish[] {
  return [..._queue]
}

/**
 * Clear all entries from the queue (useful in tests and on sign-out).
 */
export function clearQueue(): void {
  _queue.splice(0, _queue.length)
}
