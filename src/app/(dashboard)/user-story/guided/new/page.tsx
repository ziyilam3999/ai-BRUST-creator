'use client'

import { useRouter } from 'next/navigation'
import { GuidedCreatorContainer } from '@/components/guided'

export default function GuidedUserStoryPage() {
  const router = useRouter()

  return (
    <div className="h-[calc(100vh-4rem)]">
      <GuidedCreatorContainer
        documentType="user_story"
        onClose={() => router.push('/history')}
      />
    </div>
  )
}
