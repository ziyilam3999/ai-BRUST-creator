'use client'
// Legacy deep-link — primary creation entry is /business-rule/new (mode toggle)

import { useRouter } from 'next/navigation'
import { GuidedCreatorContainer } from '@/components/guided'

export default function GuidedBusinessRulePage() {
  const router = useRouter()

  return (
    <div className="h-[calc(100vh-4rem)]">
      <GuidedCreatorContainer
        documentType="business_rule"
        onClose={() => router.push('/history')}
      />
    </div>
  )
}
