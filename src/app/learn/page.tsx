import { Suspense } from 'react'
import { LearnPage } from '@/fundamentals/LearnPage'
export default function Page() {
  return (
    <Suspense fallback={null}>
      <LearnPage />
    </Suspense>
  )
}
