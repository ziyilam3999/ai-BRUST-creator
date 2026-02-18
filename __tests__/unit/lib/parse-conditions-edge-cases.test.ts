/**
 * C5 (partial): parseConditions edge-case tests — TDD
 * Covers: (a) nested parentheticals, (b) NOT/UNLESS operators, (c) numeric comparators
 */
import { describe, it, expect } from 'vitest'
import { parseConditions } from '@/lib/guided/br-to-us-analyzer'

describe('parseConditions — edge cases', () => {

  // ── (a) Nested parentheticals ────────────────────────────────────────────

  it('(a) splits top-level OR when one operand is a parenthetical group', () => {
    // "(A AND B) OR C"  →  ["(A AND B)", "C"]
    const result = parseConditions('(A AND B) OR C')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('(A AND B)')
    expect(result[1]).toBe('C')
  })

  it('(a) preserves nested parenthetical group intact', () => {
    // "(user is admin OR user is owner) AND account is active"
    // Top-level AND → ["(user is admin OR user is owner)", "account is active"]
    const result = parseConditions('(user is admin OR user is owner) AND account is active')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('(user is admin OR user is owner)')
    expect(result[1]).toBe('account is active')
  })

  it('(a) handles double-nested parentheticals without splitting inner content', () => {
    const result = parseConditions('((A AND B) OR C) AND D')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('((A AND B) OR C)')
    expect(result[1]).toBe('D')
  })

  // ── (b) NOT / UNLESS operators ───────────────────────────────────────────

  it('(b) treats "NOT condition" as a single condition token', () => {
    const result = parseConditions('NOT user is blocked')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('NOT user is blocked')
  })

  it('(b) splits "A AND NOT B" correctly', () => {
    const result = parseConditions('account is active AND NOT user is suspended')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('account is active')
    expect(result[1]).toBe('NOT user is suspended')
  })

  it('(b) treats "UNLESS condition" as a single negated condition', () => {
    const result = parseConditions('UNLESS account is expired')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('UNLESS account is expired')
  })

  it('(b) splits "A AND UNLESS B" correctly', () => {
    const result = parseConditions('order is confirmed AND UNLESS payment failed')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('order is confirmed')
    expect(result[1]).toBe('UNLESS payment failed')
  })

  // ── (c) Numeric comparators ──────────────────────────────────────────────

  it('(c) keeps "value > 100" as a single condition', () => {
    const result = parseConditions('amount > 100')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('amount > 100')
  })

  it('(c) splits "amount >= 100 AND status = active"', () => {
    const result = parseConditions('amount >= 100 AND status = active')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('amount >= 100')
    expect(result[1]).toBe('status = active')
  })

  it('(c) handles ≠ unicode comparator as part of condition', () => {
    const result = parseConditions('priority ≠ low')
    expect(result).toHaveLength(1)
    expect(result[0]).toBe('priority ≠ low')
  })

  it('(c) handles != comparator as part of condition', () => {
    const result = parseConditions('status != cancelled AND amount <= 500')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('status != cancelled')
    expect(result[1]).toBe('amount <= 500')
  })

  it('(c) handles < and > without splitting on them', () => {
    const result = parseConditions('score < 50 OR score > 90')
    expect(result).toHaveLength(2)
    expect(result[0]).toBe('score < 50')
    expect(result[1]).toBe('score > 90')
  })
})
