import { WORKER } from '@/offline/worker'
export const dynamic = 'force-static'
export function GET() {
  return new Response(WORKER, {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-cache',
      'Service-Worker-Allowed': '/',
    },
  })
}
