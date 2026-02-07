/**
 * Input sanitization for AI interactions.
 *
 * Prompt injection defense: sanitizeUserInput provides defense-in-depth by filtering
 * known injection patterns. The primary protection is the system prompt structure
 * itself (Anthropic's message API separates system/user roles), so this layer is
 * a secondary safeguard.
 *
 * XSS strategy: All AI output is rendered via React JSX (no dangerouslySetInnerHTML),
 * so React's built-in auto-escaping handles XSS. No manual output sanitization needed.
 */

/**
 * Patterns that may indicate prompt injection attempts.
 * These are common techniques used to manipulate AI behavior.
 */
const INJECTION_PATTERNS = [
  /ignore previous instructions/gi,
  /disregard all previous/gi,
  /system:\s*/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<\|[^|]+\|>/g,  // Special tokens like <|endoftext|>, <|im_start|>
]

/**
 * Maximum allowed input length to prevent token abuse.
 */
const MAX_INPUT_LENGTH = 10000

/**
 * Sanitize user input before sending to AI.
 * Defense-in-depth: filters known injection patterns and enforces length limits.
 * The primary defense is the system/user role separation in the Anthropic message API.
 *
 * @param input - Raw user input
 * @returns Sanitized input safe for AI processing
 */
export function sanitizeUserInput(input: string): string {
  if (!input) {
    return ''
  }

  let sanitized = input

  // Replace injection patterns with [filtered]
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[filtered]')
  }

  // Limit length to prevent token abuse
  return sanitized.slice(0, MAX_INPUT_LENGTH)
}

/**
 * Check if input appears to be a prompt injection attempt.
 * Useful for logging/monitoring without modifying input.
 *
 * @param input - User input to check
 * @returns True if potential injection detected
 */
export function isPromptInjectionAttempt(input: string): boolean {
  if (!input) {
    return false
  }

  // Create fresh regex instances to avoid stateful global flag issues
  const patterns = [
    /ignore previous instructions/i,
    /disregard all previous/i,
    /system:\s*/i,
    /\[INST\]/i,
    /\[\/INST\]/i,
    /<\|[^|]+\|>/,
  ]

  return patterns.some(pattern => pattern.test(input))
}

/**
 * Sanitize structured content (like JSON) before AI processing.
 * Recursively sanitizes string values in objects.
 *
 * @param content - Object with potential string values
 * @returns Sanitized object
 */
export function sanitizeContent<T extends Record<string, unknown>>(content: T): T {
  const sanitized = { ...content }

  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeUserInput(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = sanitizeContent(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map(item =>
        typeof item === 'string' ? sanitizeUserInput(item) :
        typeof item === 'object' && item !== null ? sanitizeContent(item as Record<string, unknown>) :
        item
      )
    }
  }

  return sanitized
}
