import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn (className utility)', () => {
  it('should merge single class string', () => {
    const result = cn('text-red-500')
    expect(result).toBe('text-red-500')
  })

  it('should merge multiple class strings', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toBe('text-red-500 bg-blue-500')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    )
    expect(result).toBe('base-class active-class')
  })

  it('should merge Tailwind classes correctly (last wins)', () => {
    // tailwind-merge should resolve conflicts
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['class-a', 'class-b'], 'class-c')
    expect(result).toBe('class-a class-b class-c')
  })

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end')
    expect(result).toBe('base end')
  })

  it('should handle empty strings', () => {
    const result = cn('base', '', 'end')
    expect(result).toBe('base end')
  })

  it('should return empty string for no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle object syntax for conditional classes', () => {
    const result = cn({
      'always-on': true,
      'always-off': false,
      'conditional': 1 > 0,
    })
    expect(result).toBe('always-on conditional')
  })

  it('should merge conflicting Tailwind responsive classes', () => {
    const result = cn('text-sm md:text-lg', 'md:text-xl')
    expect(result).toBe('text-sm md:text-xl')
  })
})
