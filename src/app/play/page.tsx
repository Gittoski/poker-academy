import { redirect } from 'next/navigation'

/** Preserve older entry links, with explicit history links kept in the archive. */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = await searchParams
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') params.set(key, value)
    else for (const item of value ?? []) params.append(key, item)
  }
  const archive = params.get('review') === '1' || params.get('archive') === '1'
  params.delete('archive')
  redirect(
    `${archive ? '/archive/play' : '/live'}${params.size ? '?' + params : ''}`,
  )
}
